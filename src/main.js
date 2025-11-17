import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = _traverse.default;
const generate = _generate.default;

export default function morphPlugin(options = {}) {
  const { include = /\.js$/ } = options;
  let isBuild = false;

  return {
    name: 'vite-plugin-morph-handshake',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    transform(code, id) {
      if (!isBuild) return null;
      if (!include.test(id)) return null;

      try {
        const ast = parse(code, { sourceType: 'module' });
        let transformed = false;

        traverse(ast, {
          ExportDefaultDeclaration(path) {
            let objectExpression = null;
            // console.log ( path.node.declaration )

            // Case 1: Direct ObjectExpression (e.g., export default { handshake: ... })
            if (path.node.declaration.type === 'ObjectExpression') {
              objectExpression = path.node.declaration;
            }
            // Case 2: Identifier (e.g., export default contacts)
            else if (path.node.declaration.type === 'Identifier') {
              const binding = path.scope.getBinding(path.node.declaration.name);
              if (
                binding &&
                binding.path.node.type === 'VariableDeclarator' &&
                binding.path.node.init?.type === 'ObjectExpression'
              ) {
                objectExpression = binding.path.node.init;
              }
            }

            if (objectExpression) {
              objectExpression.properties.forEach((prop) => {
                if (
                  prop.type === 'ObjectProperty' &&
                  prop.key.type === 'Identifier' &&
                  prop.key.name === 'handshake' &&
                  prop.value.type === 'ObjectExpression'
                ) {
                  prop.value.properties = []; // Empty the handshake object
                  transformed = true;
                }
              });
            }
          },
        });

        if (transformed) {
          const output = generate(ast, {}, code);
          return { code: output.code, map: output.map };
        }
      } catch (e) {
        // Error handling will be implemented
        // this.error (`Error transforming ${id}: ${e.message}`);
      }

      return null;
    },
  };
}
