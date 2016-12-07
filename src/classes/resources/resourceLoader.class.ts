import { AudioResource } from './audioResource.class';
import { ImageResource } from './imageResource.class';
import { AsyncResource } from './asyncResource.class';

declare type progressCallback = (index?: number, total?: number, source?: string, resource?: AsyncResource) => void;

export abstract class ResourceLoader {

  static load(source: string): Promise<AsyncResource> {
    let extension = /[^.]*\.([^.]+)$/.exec(source);
    switch(extension[1]) {
      case 'png':
      case 'jpg':
      case 'svg':
        return new ImageResource().load(source);
      case 'mp3':
        return new AudioResource().load(source);
      default:
        return null;
    }
  }

  static loadMany(sources: string[], progress: progressCallback = (() => { /* noop */})): Promise<AsyncResource[]> {
    let promises: Promise<AsyncResource>[] = [];
    let index: number = 0;
    let source: string;
    for(let i = 0; i < sources.length; i++) {
      source = sources[i];
      promises.push(ResourceLoader.load(source).then((resource: AsyncResource) => {
        progress(index++, sources.length, source, resource);
        return resource;
      }));
    }
    return Promise.all(promises);
  }

}