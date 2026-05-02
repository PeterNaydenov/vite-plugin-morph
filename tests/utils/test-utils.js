/**
 * Common test utilities and mock builders
 */

export function createMockMorphContext(options = {}) {
  const {
    file = 'test.morph',
    hasCss = true,
    hasScript = false,
    timestamp = Date.now(),
  } = options;

  let content = `<template><div class="test">Hello</div></template>`;

  if (hasCss) {
    content += `<style>.test { color: red; }</style>`;
  }

  if (hasScript) {
    content += `<script>function test() { return 'hello'; }</script>`;
  }

  return {
    file,
    read: vi.fn().mockResolvedValue(content),
    timestamp,
    modules: [{ id: file }],
  };
}