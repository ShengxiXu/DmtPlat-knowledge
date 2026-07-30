import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import path from 'path';

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NS_R =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function getTextFromShape(spNode) {
  const texts = [];
  const txBody = spNode['p:txBody']?.[0];
  if (!txBody) return '';
  const paras = txBody['a:p'] || [];
  for (const p of paras) {
    let paraText = '';
    const runs = p['a:r'] || [];
    for (const r of runs) {
      const t = r['a:t'];
      if (typeof t === 'string') paraText += t;
      else if (Array.isArray(t)) paraText += t.join('');
    }
    // 也处理 a:endParaRPr 等直接文本
    if (!paraText && p['a:fld']) {
      const fld = p['a:fld'][0];
      const t = fld['a:t'];
      if (typeof t === 'string') paraText += t;
    }
    if (paraText.trim()) texts.push(paraText);
  }
  return texts.join('\n');
}

function getSlideTexts(slideXml) {
  const shapes = [];
  const cSld = slideXml['p:cSld']?.[0];
  if (!cSld) return shapes;
  const spTree = cSld['p:spTree']?.[0];
  if (!spTree) return shapes;

  const shapeNodes = [
    ...(spTree['p:sp'] || []),
    ...(spTree['p:pic'] || []),
    ...(spTree['p:graphicFrame'] || []),
  ];

  for (const node of shapeNodes) {
    const text = getTextFromShape(node);
    if (!text.trim()) continue;
    const nvPr =
      node['p:nvSpPr']?.[0] ||
      node['p:nvPicPr']?.[0] ||
      node['p:nvGraphicFramePr']?.[0];
    const placeholder = nvPr?.['p:nvPr']?.[0]?.['p:ph']?.[0]?.$;
    shapes.push({
      text: text.trim(),
      placeholderType: placeholder?.type || null,
      placeholderIdx: placeholder?.idx || null,
    });
  }
  return shapes;
}

function classifySlideType(index, total, shapes) {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'end';

  const allText = shapes.map((s) => s.text).join(' ');
  const lower = allText.toLowerCase();
  if (/目录|contents|agenda|大纲|outline/.test(lower)) return 'catalog';

  // 内容页：有标题和正文
  const hasTitle = shapes.some(
    (s) => s.placeholderType === 'title' || s.placeholderType === 'ctrTitle'
  );
  const hasBody = shapes.some(
    (s) => s.placeholderType === 'body' || s.placeholderType === 'obj'
  );
  if (hasTitle && hasBody) return 'content';
  if (hasTitle) return 'section';
  return 'content';
}

async function parseTheme(zip, themePath) {
  try {
    const xmlStr = await zip.file(themePath)?.async('text');
    if (!xmlStr) return null;
    const theme = await parseStringPromise(xmlStr);
    const themeElem = theme['a:theme']?.['a:themeElements']?.[0];
    if (!themeElem) return null;

    const colorScheme = themeElem['a:clrScheme']?.[0];
    const fontScheme = themeElem['a:fontScheme']?.[0];

    const colors = {};
    if (colorScheme) {
      const extractColor = (elem) => {
        const rgb =
          elem?.['a:srgbClr']?.[0]?.$?.val ||
          elem?.['a:sysClr']?.[0]?.$?.lastClr;
        return rgb ? `#${rgb}` : null;
      };
      for (const key of Object.keys(colorScheme)) {
        if (key === '$') continue;
        const val = extractColor(colorScheme[key][0]);
        if (val) colors[key.replace('a:', '')] = val;
      }
    }

    const fonts = {};
    if (fontScheme) {
      const major =
        fontScheme['a:majorFont']?.[0]?.['a:latin']?.[0]?.$?.typeface;
      const minor =
        fontScheme['a:minorFont']?.[0]?.['a:latin']?.[0]?.$?.typeface;
      if (major) fonts.major = major;
      if (minor) fonts.minor = minor;
    }

    return { colors, fonts };
  } catch (e) {
    return null;
  }
}

async function parseSlideRels(zip, relsPath) {
  try {
    const xmlStr = await zip.file(relsPath)?.async('text');
    if (!xmlStr) return {};
    const rels = await parseStringPromise(xmlStr);
    const result = { images: [], charts: [], hyperlinks: [] };
    const relationships = rels?.['Relationships']?.['Relationship'] || [];
    for (const r of relationships) {
      const type = r.$?.Type || '';
      const target = r.$?.Target || '';
      if (type.includes('image')) result.images.push(target);
      else if (type.includes('chart')) result.charts.push(target);
      else if (type.includes('hyperlink')) result.hyperlinks.push(target);
    }
    return result;
  } catch (e) {
    return { images: [], charts: [], hyperlinks: [] };
  }
}

async function parseNotes(zip, notesPath) {
  try {
    const xmlStr = await zip.file(notesPath)?.async('text');
    if (!xmlStr) return '';
    const notes = await parseStringPromise(xmlStr);
    const cSld = notes['p:notes']?.['p:cSld']?.[0];
    const spTree = cSld?.['p:spTree']?.[0];
    const spNodes = spTree?.['p:sp'] || [];
    for (const sp of spNodes) {
      const ph = sp['p:nvSpPr']?.[0]?.['p:nvPr']?.[0]?.['p:ph']?.[0]?.$;
      if (ph?.type === 'body' || ph?.type === 'obj') {
        return getTextFromShape(sp);
      }
    }
    return '';
  } catch (e) {
    return '';
  }
}

export async function parsePPTX(fileBuffer) {
  const zip = await JSZip.loadAsync(fileBuffer);

  // 读取 presentation.xml 拿到 slide 顺序
  const presXmlStr = await zip.file('ppt/presentation.xml')?.async('text');
  if (!presXmlStr) throw new Error('无效的 PPTX 文件');
  const pres = await parseStringPromise(presXmlStr);
  const sldIdLst =
    pres['p:presentation']?.['p:sldIdLst']?.[0]?.['p:sldId'] || [];
  const slideRIds = sldIdLst
    .map((s) => s.$?.['r:id'] || s.$?.id)
    .filter(Boolean);

  // 读取 presentation.xml.rels 找到每个 rId 对应的 slide 文件名
  const presRelsStr = await zip
    .file('ppt/_rels/presentation.xml.rels')
    ?.async('text');
  const presRels = await parseStringPromise(presRelsStr);
  const relMap = {};
  for (const r of presRels['Relationships']['Relationship']) {
    relMap[r.$['Id']] = r.$['Target'];
  }

  // 解析主题（取第一个）
  const themePath = 'ppt/theme/theme1.xml';
  const theme = await parseTheme(zip, themePath);

  const slides = [];
  for (let i = 0; i < slideRIds.length; i++) {
    const rId = slideRIds[i];
    const slideFile = relMap[rId];
    if (!slideFile) continue;

    const slidePath = path.posix.join('ppt', slideFile);
    const slideXmlStr = await zip.file(slidePath)?.async('text');
    if (!slideXmlStr) continue;
    const slideXml = await parseStringPromise(slideXmlStr);

    const shapes = getSlideTexts(slideXml['p:sld']);
    const slideType = classifySlideType(i, slideRIds.length, shapes);

    // 解析关系
    const slideBase = path.basename(slideFile);
    const relsPath = `ppt/slides/_rels/${slideBase}.rels`;
    const rels = await parseSlideRels(zip, relsPath);

    // 演讲备注
    const notesRelsPath = `ppt/slides/_rels/${slideBase}.rels`;
    let notesText = '';
    // notesSlide 关系在 slide rels 里
    const notesRels = await parseSlideRels(zip, notesRelsPath);
    // 这里简化：通过 notesSlide 关系查找备注
    const slideRelsFull = presRels['Relationships']['Relationship'];
    // 实际备注关系在 slide 自己的 rels 里，类型为 http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide
    // parseSlideRels 目前只收集 image/chart/hyperlink，需要扩展
    const noteTarget = await findNotesTarget(zip, slideBase);
    if (noteTarget) {
      notesText = await parseNotes(zip, noteTarget);
    }

    const titleShape = shapes.find(
      (s) => s.placeholderType === 'title' || s.placeholderType === 'ctrTitle'
    );
    const bodyShapes = shapes.filter(
      (s) =>
        s.placeholderType === 'body' ||
        s.placeholderType === 'obj' ||
        !s.placeholderType
    );

    slides.push({
      index: i + 1,
      type: slideType,
      title: titleShape?.text || shapes[0]?.text || '',
      bullets: bodyShapes.map((s) => s.text),
      hasImage: rels.images.length > 0,
      hasChart: rels.charts.length > 0,
      imageCount: rels.images.length,
      chartCount: rels.charts.length,
      notes: notesText,
    });
  }

  // 统计
  const typeCount = {};
  for (const s of slides) typeCount[s.type] = (typeCount[s.type] || 0) + 1;

  return {
    fileType: 'pptx',
    title: slides[0]?.title || '',
    totalSlides: slides.length,
    typeDistribution: typeCount,
    theme: theme || {},
    slides,
    suggestedFields: buildPPTSuggestedFields(slides, theme),
  };
}

async function findNotesTarget(zip, slideBase) {
  const relsPath = `ppt/slides/_rels/${slideBase}.rels`;
  try {
    const xmlStr = await zip.file(relsPath)?.async('text');
    if (!xmlStr) return null;
    const rels = await parseStringPromise(xmlStr);
    for (const r of rels['Relationships']['Relationship']) {
      const type = r.$?.Type || '';
      if (type.includes('notesSlide')) {
        const target = r.$?.Target || '';
        return path.posix.join('ppt/notesSlides', target);
      }
    }
  } catch (e) {}
  return null;
}

function buildPPTSuggestedFields(slides, theme) {
  const fields = [
    {
      id: 'topic',
      label: '演讲主题',
      type: 'text',
      required: true,
      placeholder: '例如：DmtPlat 产品发布会',
    },
    {
      id: 'audience',
      label: '受众',
      type: 'text',
      required: false,
      placeholder: '例如：潜在客户、销售团队',
    },
    {
      id: 'core_message',
      label: '核心信息',
      type: 'textarea',
      required: false,
      placeholder: '本次演讲要传递的 1-3 个核心观点',
      rows: 3,
    },
  ];

  const contentSlides = slides.filter((s) => s.type === 'content');
  if (contentSlides.length > 0) {
    fields.push({
      id: 'key_points',
      label: '关键要点',
      type: 'textarea',
      required: false,
      placeholder: '各页内容要点，每行一条',
      rows: 5,
    });
  }

  if (theme?.colors) {
    fields.push({
      id: 'color_scheme',
      label: '配色方案',
      type: 'text',
      required: false,
      placeholder: '例如：蓝色商务风',
    });
  }

  return fields;
}
