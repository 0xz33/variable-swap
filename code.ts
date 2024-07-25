/// <reference types="@figma/plugin-typings" />

// Mapping object
const colorMapping: { [key: string]: string } = {
  "OLD NEUTRALS/default/T__primary-default": "Primary/500",
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
          if (v.property === "fills" && colorMapping[v.name]) {
            const newVariableName = colorMapping[v.name];
            console.log(`  Should be changed to: ${newVariableName}`);

            const newVariable = await findVariableByName(newVariableName);

            if (newVariable) {
              // Set the new variable
              if ("setBoundVariable" in node) {
                (node as any).setBoundVariable("fills", newVariable);
                console.log(`  Variable updated to: ${newVariableName}`);
              } else {
                console.log(`  Error: Node doesn't support setBoundVariable`);
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

  figma.closePlugin();
}

main();
