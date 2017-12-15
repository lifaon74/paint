import { Compositing } from './ImageDataCompositing';

self.addEventListener('message', (event: MessageEvent) => {
  // Compositing.apply.apply(Compositing, [Compositing.get(event.data[1]), ...event.data.slice(2)]);
  // console.log([Compositing.get(event.data[1]), ...event.data.slice(2)]);
  Compositing.apply(Compositing.get(event.data[1]), event.data[2], event.data[3], event.data[4], event.data[5], event.data[6], event.data[7], event.data[8], event.data[9]);
  (self as any).postMessage(event.data, [event.data[2].data.buffer, event.data[3].data.buffer]);
}, false);