const { has, find, propEq } = require("ramda");

const processElement = (node, parentAttrs = {}) => {
  if (node.name == "svg") {
    return processSVG(node, parentAttrs);
  } else if (node.name == "g") {
    return processG(node, parentAttrs);
  } else if (node.name == "text") {
    return processText(node, parentAttrs);
  } else if (node.name == "rect") {
    return processRect(node, parentAttrs);
  }
};

const topLeft = (node, parentAttrs = {}) => {
  let styles = { position: "absolute" };

  const viewBox = parentAttrs.viewBox;

  if (
    node.attrs &&
    node.attrs.transform &&
    node.attrs.transform.match(/^translate\([^\(]+\)$/)
  ) {
    const transform = node.attrs.transform
      .replace(/^translate\(/, "")
      .replace(/\)$/, "")
      .split(", ");
    styles.left = transform[0] - (viewBox ? viewBox.x : 0);
    styles.top = transform[1] - (viewBox ? viewBox.y : 0);
  }

  if (node.attrs && node.attrs.height) {
    styles.height = node.attrs.height;
  }

  if (node.attrs && node.attrs.width) {
    styles.width = node.attrs.width;
  }

  if (node.attrs && node.attrs.x) {
    styles.left = node.attrs.x - (viewBox ? viewBox.x : 0);
  }

  if (node.attrs && node.attrs.y) {
    styles.top = node.attrs.y - (viewBox ? viewBox.y : 0);
  }

  return styles;
};

const processChildren = (parent, parentAttrs = {}) => {
  const children = parent.childs ? parent.childs : [];

  return children
    .filter(node => {
      const processedNode = processElement(node, parentAttrs);
      return processedNode;
    })
    .map(node => {
      return processElement(node, parentAttrs);
    });
};

const processG = (node, parentAttrs = {}) => {
  const tl = topLeft(node, parentAttrs);

  let styles = { ...tl };

  if (node.attrs.fontSize) {
    parentAttrs.fontSize = node.attrs.fontSize;
  }
  if (node.attrs.fontWeight) {
    parentAttrs.fontWeight = node.attrs.fontWeight;
  }

  if (node.attrs.lineHeight) {
    parentAttrs.lineHeight = node.attrs.lineSpacing;
  }
  if (node.attrs.fill) {
    parentAttrs.fill = node.attrs.fill;
  }

  let use = null;
  node.childs &&
    node.childs.forEach(child => {
      if (child.name == "use") {
        if (child.attrs.fill) {
          styles.background = child.attrs.fill;
        }
      }
    });

  // Here we check if the child is a rectangle
  const type =
    (node.childs[1] && node.childs[1].name === "rect") || !node.attrs.stroke
      ? "items"
      : "sections";

  if (node.childs[1] && node.childs[1].name === "rect") {
    styles = {
      ...styles,
      ...node.childs[1].attrs
    };
    return {
      id: node.attrs.id,
      type: "space",
      style: styles
    };
  }

  if (type === "items") {
    return processChildren(node, parentAttrs)
  } else {
    return {
      id: node.attrs.id,
      [type]: processChildren(node, parentAttrs),
      childs: processChildren(node, parentAttrs),
      styles
    };
  }
};

const processSVG = (node, parentAttrs) => {
  const MOBILE_WIDTH = node.attrs.width;
  const MOBILE_HEIGHT = node.attrs.height;

  const viewBox = {
    x: MOBILE_WIDTH,
    y: MOBILE_HEIGHT
  };
  parentAttrs.viewBox = viewBox;

  let rootStyle = {};
  if (node.attrs.style) {
    rootStyle = node.attrs.style.split(/\;\s*/).reduce((r, style) => {
      const keyValue = style.split(/\:\s*/);
      if (keyValue.length == 2) {
        r[keyValue[0]] = keyValue[1];
        if (
          (keyValue[0] == "background" && keyValue[1].length == 4) ||
          keyValue[1].length == 7
        ) {
          r["background"] = keyValue[1];
        }
      }
      return r;
    }, {});
  }

  const background =
    rootStyle && rootStyle.background
      ? rootStyle.background
      : rootStyle && rootStyle.background
      ? rootStyle.background
      : "#ffffff";
  let styles = {
    flex: 1,
    alignSelf: "stretch"
  };
  if (background) {
    styles.background = background;
  }

  const type = "items";

  return {
    id: node.attrs.id,
    [type]: processChildren(node, parentAttrs),
    childs: processChildren(node, parentAttrs),
    // rootStyle,
    style: styles
  };
};

const processRect = (node, parentAttrs = {}) => {
  const tl = topLeft(node, parentAttrs);

  let styles = { ...tl };

  const attrs = node.attrs ? node.attrs : {};
  if (attrs.fill) {
    styles.background = attrs.fill;
  }

  if (attrs.opacity && attrs.fill) {
    const op = parseFloat(attrs.opacity)
      .toFixed(2)
      .split(".")[1];
    styles.background = attrs.fill + op;
  }

  if (attrs.rx) {
    styles.borderRadius = attrs.rx;
  }

  if (attrs.ry) {
    styles.borderRadius = attrs.rx;
  }

  return {
    id: node.attrs.id,
    align: "center",
    type: "space",
    childs: processChildren(node, parentAttrs),
    style: styles
  };
};

const processText = (node, parentAttrs = {}) => {
  let style = {};
  let text = "";

  const attrs = node.attrs ? node.attrs : {};

  if (attrs.x || attrs.y) {
    style.position = "absolute";
    style.left = attrs.x ? attrs.x : 0;
    style.top = attrs.y ? attrs.y : 0;
  } else {
    style.align = "center";
  }

  style.background = "transparent";
  if (parentAttrs.fontSize) {
    style.size = parentAttrs.fontSize;
  }
  if (attrs.fontSize) {
    style.size = attrs.fontSize;
  }

  if (parentAttrs.lineHeight) {
    style.lineHeight = parentAttrs.lineHeight;
  }
  if (parentAttrs.fontWeight) {
    style.fontWeight = parentAttrs.fontWeight;
  }
  if (attrs.fontWeight) {
    style.fontWeight = attrs.fontWeight;
  }

  if (parentAttrs.fill) {
    style.color = parentAttrs.fill;
  }
  if (attrs.fill) {
    style.color = attrs.fill;
  }
  if (parentAttrs.fontFamily) {
    style.font = parentAttrs.fontFamily;
  }
  if (attrs.fontFamily) {
    style.font = attrs.fontFamily.split(", ")[0];
  }

  return {
    id: node.attrs.id,
    type: "label",
    childs: processChildren(node, parentAttrs),
    text: node.attrs.id || text,
    style
  };
};

module.exports.processElement = processElement;
