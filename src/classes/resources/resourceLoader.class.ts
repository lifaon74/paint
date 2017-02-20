import { AudioResource } from './audioResource.class';
import { ImageResource } from './imageResource.class';
import { AsyncResource } from './asyncResource.class';
import { ResourceHelper } from './resourceHelper.class';

declare type progressCallback = (index?: number, total?: number, resource?: AsyncResource) => void;

export class ResourceSource {
  constructor(
    public name: string,
    public sources: string[]
  ) {}
}

export abstract class ResourceLoader {

  static load(source: string): Promise<AsyncResource> {
    switch(ResourceHelper.pathToExtension(source)) {
      case 'png':
      case 'jpg':
      case 'svg':
        return new ImageResource().load(source);
      case 'mp3':
      case 'ogg':
        return new AudioResource().load(source);
      default:
        return <any>Promise.reject(new Error('Invalid resource extension'));
    }
  }

  static loadWithAlternatives(sources: string[], index: number = 0): Promise<AsyncResource> {
    if(index >= sources.length) {
      return <any>Promise.reject(new Error('Invalid resource path ' + JSON.stringify(sources)));
    } else {
      return ResourceLoader.load(sources[index]).catch((error) => {
        // console.warn(error);
        return ResourceLoader.loadWithAlternatives(sources, index + 1);
      });
    }
  }

  static loadMany(sources: string[][], progress: progressCallback = (() => { /* noop */})): Promise<AsyncResource[]> {
    let promises: Promise<AsyncResource>[] = [];
    let index: number = 0;
    let sourceAlternatives: string[];
    for(let i = 0; i < sources.length; i++) {
      sourceAlternatives = sources[i];
      promises.push(
        ResourceLoader.loadWithAlternatives(sourceAlternatives).then((resource: AsyncResource) => {
          progress(index++, sources.length, resource);
          return resource;
        })
      );
    }
    return Promise.all(promises);
  }

}