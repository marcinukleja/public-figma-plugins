type VariableInfo = {
  name: string;
  description: string;
  color: RGB;
  opacity: number | undefined;
  styleId: string;
};

type VariableMode = {
  modeId: string;
};

// FUNCTIONS

function createVariables(): void {
  if (allVariablesData.length <= 0) {
    figma.notify("No convertible styles found");
    return;
  }
  // Create a new variable collection
  const collection = figma.variables.createVariableCollection(`Color Styles`);
  const modeId = collection.modes[0].modeId;
  // collection.renameMode(modeId, "Style");

  // Create a variable for each variable data
  uniqueVariablesData.forEach((variableData) => {
    try {
      const variable = figma.variables.createVariable(variableData.name, collection.id, "COLOR");
      variable.setValueForMode(modeId, {
        r: variableData.color.r,
        g: variableData.color.g,
        b: variableData.color.b,
        a: variableData.opacity,
      });
      variable.description = variableData.description;

      // Assign the variable to the style
      const style = figma.getStyleById(variableData.styleId) as PaintStyle;
      const paintsCopy = clone(style.paints);
      paintsCopy[0] = figma.variables.setBoundVariableForPaint(paintsCopy[0], "color", variable);
      style.paints = paintsCopy;
    } catch (error) {
      console.log(error);
      figma.notify("Error creating variables. Contact plugin creator (@marcinukleja).", { timeout: 5000, error: true });
      figma.closePlugin();
    }
  });
}

function styleToVariableInfo(style: PaintStyle): VariableInfo | undefined {
  // Filter out invisible paints
  const paints = style.paints.filter(({ visible }) => visible); // TODO: Consider removing this
  // Process only styles with one solid paint
  if (paints.length === 1 && paints[0].type === "SOLID") {
    const {
      blendMode,
      color: { r, g, b },
      opacity,
    } = paints[0];
    const hex = rgbToHex({ r, g, b });
    if (blendMode === "NORMAL") {
      return {
        name: style.name,
        description: style.description,
        color: { r, g, b },
        opacity: opacity,
        styleId: style.id,
      };
    }
    console.log("Style not convertible: ", style.name);
    return undefined;
  }
}

// HELPERS

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const hex = [toHex(r), toHex(g), toHex(b)].join("");
  return `#${hex}`;
}

function clone(val: any) {
  return JSON.parse(JSON.stringify(val));
}

// RUN

console.clear();

const styles = figma.getLocalPaintStyles();

let allVariablesData: VariableInfo[] = [];
const uniqueVariablesData: VariableInfo[] = [];
const duplicateVariablesData: VariableInfo[] = [];

allVariablesData = styles.map((style) => styleToVariableInfo(style)).filter((item) => item !== undefined) as VariableInfo[];

allVariablesData.forEach((variableData) => {
  variableData.name = variableData.name.replace(/\./g, "_");
  // TODO: Identify hidden styles and set hidden publish state

  if (uniqueVariablesData.some((item) => item.name === variableData.name)) {
    duplicateVariablesData.push(variableData);
  } else {
    uniqueVariablesData.push(variableData);
  }
});

console.log("ALL VARIABLES DATA:", allVariablesData);
console.log("UNIQUE VARIABLES:", uniqueVariablesData);
console.log("DUPLICATE VARIABLES:", duplicateVariablesData);

createVariables();

const variablesCount = uniqueVariablesData.length;
const duplicatesCount = duplicateVariablesData.length;

let message = `${variablesCount} variables created!`;

if (duplicatesCount === 1) {
  message += " 1 duplicate skipped.";
} else if (duplicatesCount > 1) {
  message += ` ${duplicatesCount} duplicates skipped.`;
}

figma.closePlugin(message);
