import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import ts from 'typescript';

const source = ts.transpileModule(
  fs.readFileSync(new URL('../src/views/admin/orders/index.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } },
).outputText;
let expanded = false;
let hookIndex = 0;
let requests = 0;
let receivedSignal: AbortSignal | undefined;
const client = new QueryClient();
const probes: Array<{
  enabled: boolean;
  staleTime: number;
  queryKey: string[];
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
}> = [];
const context = {
  exports: {} as { NotificationStatus: (props: { kind: string; id: string }) => unknown },
  React: { createElement: () => null },
  require: (name: string) => {
    if (name === 'react') {
      return { useState: () => [hookIndex++ === 0 ? expanded : false, () => {}] };
    }
    if (name === '@tanstack/react-query')
      return {
        useQueryClient: () => client,
        useQuery: (options: (typeof probes)[number]) => {
          probes.push(options);
          return {};
        },
      };
    if (name === '@/services/order.service')
      return {
        getOrderDiscordNotification: async (_id: string, signal: AbortSignal) => {
          receivedSignal = signal;
          requests++;
          return { status: 'sent' };
        },
      };
    return {};
  },
};
// Run the actual component's query options against the installed Query client.
vm.runInNewContext(`${source}\nexports.NotificationStatus = NotificationStatus;`, context);
context.exports.NotificationStatus({ kind: 'order', id: 'one' });
assert.equal(probes[0].enabled, false);
let observer = new QueryObserver(client, probes[0]);
let stop = observer.subscribe(() => {});
assert.equal(requests, 0, 'Collapsed status must not fetch');
stop();
expanded = true;
hookIndex = 0;
// Reset the mock hook cursor for the next render.
context.exports.NotificationStatus({ kind: 'order', id: 'one' });
assert.equal(probes[1].enabled, true);
observer = new QueryObserver(client, probes[1]);
stop = observer.subscribe(() => {});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(requests, 1);
assert.ok(receivedSignal instanceof AbortSignal);
stop();
observer = new QueryObserver(client, probes[1]);
stop = observer.subscribe(() => {});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(requests, 1, 'Reopening fresh status reuses cache');
stop();
client.clear();
console.log(
  'PASS collapsed status avoids requests; expanded fetches once with signal; fresh reopen uses cache',
);

let finishOldRead: (value: { status: string }) => void = () => {};
const key = ['discord-notification', 'order', 'retry-race'];
const oldRead = client
  .fetchQuery({
    queryKey: key,
    queryFn: ({ signal }) => {
      assert.ok(signal instanceof AbortSignal);
      return new Promise<{ status: string }>((resolve) => {
        finishOldRead = resolve;
      });
    },
  })
  .catch(() => {});
await client.cancelQueries({ queryKey: key, exact: true });
client.setQueryData(key, { status: 'sent' });
finishOldRead({ status: 'failed' });
await oldRead;
assert.deepEqual(
  client.getQueryData(key),
  { status: 'sent' },
  'Cancelled old GET cannot replace resend result',
);
client.clear();
console.log('PASS cancelled old status response preserves successful resend');
