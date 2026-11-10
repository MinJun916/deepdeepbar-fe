import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import ts from 'typescript';

const source = ts.transpileModule(
  fs.readFileSync(new URL('../src/components/introOverlay/index.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } },
).outputText;
for (const scenario of ['first', 'seen', 'reduced-motion', 'storage-denied']) {
  const states: boolean[] = [];
  let effect: () => () => void;
  let frame: () => void;
  let timeout: () => void;
  let marked = false;
  const context = {
    exports: {} as { default: () => unknown },
    require: () => ({
      useState: () => [false, (value: boolean) => states.push(value)],
      useEffect: (callback: () => () => void) => {
        effect = callback;
      },
    }),
    sessionStorage: {
      getItem: () => {
        if (scenario === 'storage-denied') throw new Error('blocked');
        return scenario === 'seen' ? 'true' : null;
      },
      setItem: () => {
        marked = true;
      },
    },
    window: {
      requestAnimationFrame: (callback: () => void) => {
        frame = callback;
        return 1;
      },
      cancelAnimationFrame: () => {},
      matchMedia: () => ({ matches: scenario === 'reduced-motion' }),
      setTimeout: (callback: () => void, delay: number) => {
        assert.equal(delay, 2000);
        timeout = callback;
        return 2;
      },
      clearTimeout: () => {},
    },
  };
  vm.runInNewContext(source, context);
  assert.equal(context.exports.default(), null, 'No server or returning-visit flash');
  const cleanup = effect!();
  frame!();
  if (scenario === 'first') {
    assert.equal(marked, true);
    assert.deepEqual(states, [true]);
    timeout!();
    assert.deepEqual(states, [true, false]);
  } else {
    assert.deepEqual(states, [], 'No repeat, reduced-motion or storage-error overlay');
  }
  cleanup();
}
console.log('PASS intro first/return visit, reduced motion, storage failure and dismissal');
