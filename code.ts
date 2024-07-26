/// <reference types="@figma/plugin-typings" />

// Mapping object
const colorMapping: { [key: string]: string } = {
  "OLD NEUTRALS/default/T__primary-default": "Neutral/600", // Bg-600
  "OLD NEUTRALS/default/T__primary-hover": "Neutral/700", // Bg-700
  "OLD NEUTRALS/default/T__primary-focus": "Neutral/300", // Bg-300
  "OLD NEUTRALS/default/T__primary-active": "Neutral/800", // Bg-800
  "OLD NEUTRALS/default/T__primary-disabled": "Neutral/50", // Bg-50
  "Info/T__default/T__info-default": "Info/500", // Info-500
  "Info/T__default/T__info-hover": "Info/600", // Info-600
  "Info/T__default/T__info-focus": "Info/700", // Info-700
  "Info/T__default/T__info-active": "Info/800", // Info-800
  "Info/T__default/T__info-disabled": "Info/50", // Info-50
  "warning/T__default/T__warning-default": "Warning/600", // Warning-600
  "warning/T__default/T__warning-hover": "Warning/700", // Warning-700
  "warning/T__default/T__warning-focus": "Warning/800", // Warning-800
  "warning/T__default/T__warning-active": "Warning/900", // Warning-900
  "warning/T__default/T__warning-disabled": "Warning/50", // Warning-50
  "error/T__default/T__error-default": "Error/700", // Error-700
  "error/T__default/T__error-hover": "Error/800", // Error-800
  "error/T__default/T__error-focus": "Error/900", // Error-900
  "error/T__default/T__error-active": "Error/925", // Error-925
  "error/T__default/T__error-disabled": "Error/50", // Error-50
  "success/T__default/T__success-default": "Success/600", // Success-600
  "success/T__default/T__success-hover": "Success/700", // Success-700
  "success/T__default/T__success-focus": "Success/800", // Success-800
  "success/T__default/T__success-active": "Success/900", // Success-900
  "success/T__default/T__success-disabled": "Success/50", // Success-50
  "T__surface/T__background": "Neutral/00", // Surface
};

async function getNodeVariables(
  node: SceneNode
): Promise<{ property: string; name: string }[]> {
  const variables: { property: string; name: string }[] = [];
  if ("boundVariables" in node && node.boundVariables) {
    for (const [property, bindings] of Object.entries(node.boundVariables)) {
      if (Array.isArray(bindings)) {
        for (const binding of bindings) {
          if ("id" in binding && typeof binding.id === "string") {
            const variable = await figma.variables.getVariableByIdAsync(
              binding.id
            );
            if (variable) {
              variables.push({ property, name: variable.name });
            }
          }
        }
      } else if (typeof bindings === "object" && bindings !== null) {
        if ("id" in bindings && typeof bindings.id === "string") {
          const variable = await figma.variables.getVariableByIdAsync(
            bindings.id
          );
          if (variable) {
            variables.push({ property, name: variable.name });
          }
        }
      }
    }
  }
  return variables;
}

async function findVariableByName(name: string): Promise<Variable | null> {
  const localVariables = await figma.variables.getLocalVariablesAsync();
  let variable: Variable | undefined = localVariables.find(
    (v) => v.name === name
  );

  if (!variable) {
    const collections =
      await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (const collection of collections) {
      const variables =
        await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          collection.key
        );
      const libraryVariable = variables.find((v) => v.name === name);
      if (libraryVariable) {
        variable = await figma.variables.importVariableByKeyAsync(
          libraryVariable.key
        );
        break;
      }
    }
  }

  return variable || null;
}

async function main() {
  const selection = figma.currentPage.selection;
  let changesMade = 0; // Track the number of changes made

  if (selection.length === 0) {
    figma.notify("No nodes selected");
  } else {
    for (const node of selection) {
      console.log(`Node: ${node.name}`);
      const variables = await getNodeVariables(node);
      if (variables.length > 0) {
        console.log("Applied variables:");
        for (const v of variables) {
          console.log(`- ${v.property}: ${v.name}`);

          // Handle fills
          if (v.property === "fills" && colorMapping[v.name]) {
            const newVariableName = colorMapping[v.name];
            console.log(`  Should be changed to: ${newVariableName}`);

            const newVariable = await findVariableByName(newVariableName);

            if (newVariable) {
              if ("fills" in node && Array.isArray(node.fills)) {
                const mutableFills = [...node.fills]; // Create a mutable copy
                node.fills.forEach((fill, index) => {
                  if (fill.type === "SOLID") {
                    const newFill = figma.variables.setBoundVariableForPaint(
                      fill,
                      "color",
                      newVariable
                    );
                    mutableFills[index] = newFill; // Update the fill in the mutable array
                    changesMade++; // Increment the changes counter
                  }
                });
                node.fills = mutableFills; // Assign back to node.fills
                console.log(`  Fills updated to: ${newVariableName}`);
              } else {
                console.log(`  Error: Node doesn't support fills`);
              }
            } else {
              console.log(
                `  Error: New variable "${newVariableName}" not found`
              );
            }
          }

          // Handle strokes
          if (v.property === "strokes" && colorMapping[v.name]) {
            const newVariableName = colorMapping[v.name];
            console.log(`  Should be changed to: ${newVariableName}`);

            const newVariable = await findVariableByName(newVariableName);

            if (newVariable) {
              if ("strokes" in node && Array.isArray(node.strokes)) {
                const mutableStrokes = [...node.strokes]; // Create a mutable copy
                node.strokes.forEach((stroke, index) => {
                  if (stroke.type === "SOLID") {
                    const newStroke = figma.variables.setBoundVariableForPaint(
                      stroke,
                      "color",
                      newVariable
                    );
                    mutableStrokes[index] = newStroke; // Update the stroke in the mutable array
                    changesMade++; // Increment the changes counter
                  }
                });
                node.strokes = mutableStrokes; // Assign back to node.strokes
                console.log(`  Strokes updated to: ${newVariableName}`);
              } else {
                console.log(`  Error: Node doesn't support strokes`);
              }
            } else {
              console.log(
                `  Error: New variable "${newVariableName}" not found`
              );
            }
          }
        }
      } else {
        console.log("No variables applied");
      }
      console.log("---");
    }
  }

  // Close the plugin and notify the number of changes made
  figma.closePlugin(`${changesMade} changes made.`);
}

main();
