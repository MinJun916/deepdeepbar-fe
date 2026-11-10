import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import ts from 'typescript';

const source = ts.transpileModule(
  fs.readFileSync(new URL('../src/components/staffCall/index.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } },
).outputText;
type Element = { type: unknown; props: Record<string, unknown>; children: unknown[] };
for (const status of ['sent', 'pending', 'failed', 'network-error']) {
  let closed = false;
  const toasts: unknown[] = [];
  const states: unknown[] = ['option', false, ''];
  let cursor = 0;
  const createElement = (
    type: unknown,
    props: Record<string, unknown>,
    ...children: unknown[]
  ) => ({ type, props, children });
  class ApiError extends Error {}
  const imports: Record<string, unknown> = {
    react: {
      createElement,
      useEffect: () => {},
      useRef: () => ({ current: false }),
      useState: () => {
        const index = cursor++;
        return [
          states[index],
          (value: unknown) => {
            states[index] = value;
          },
        ];
      },
    },
    '@tanstack/react-query': {
      useQuery: ({ queryKey }: { queryKey: string[] }) => ({
        data: queryKey[0] === 'staff-call-options' ? [{ id: 'option', label: '물' }] : [],
      }),
      useQueryClient: () => ({ setQueryData: () => {} }),
    },
    '@/components/sonner': { showToast: (toast: unknown) => toasts.push(toast) },
    '@/lib/axios': { ApiError },
    '@/lib/tableSession': { getTableSessionToken: () => 'session' },
    '@/services/order.service': {},
    '@/services/staff-call.service': {
      createStaffCall: async () => {
        if (status === 'network-error') throw new Error('offline');
        return { id: 'call', notification_status: status };
      },
    },
  };
  const context = {
    exports: {} as { default: (props: unknown) => Element },
    React: { createElement },
    require: (name: string) => {
      assert.ok(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
  };
  vm.runInNewContext(source, context);
  const tree = context.exports.default({
    session: { table_number: 1 },
    onClose: () => {
      closed = true;
    },
    onExpired: () => {},
    onEntered: () => {},
  });
  const elements: Element[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object' && 'children' in value) {
      const element = value as Element;
      elements.push(element);
      element.children.forEach(walk);
    }
  };
  walk(tree);
  const send = elements.find(
    (element) => element.type === 'button' && element.children.includes('요청 보내기'),
  );
  assert.ok(send, 'Send button exists');
  (send.props.onClick as () => void)();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closed, status === 'sent' || status === 'pending', `${status} close behavior`);
  assert.equal(toasts.length, closed ? 1 : 0);
  if (!closed) assert.ok(states[2], 'Failure stays visible with an error');
}
console.log('PASS sent/accepted close with toast; delivery/network failures stay open');
