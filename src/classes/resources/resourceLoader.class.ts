import { AudioResource } from './audioResource.class';
import { ImageResource } from './imageResource.class';
import { AsyncResource } from './asyncResource.class';
import { ResourceHelper } from './resourceHelper.class';
import { PromiseFactory, PromisePool } from '../promisePool.class';

declare type progressCallback = (loaded?: number, total?: number, resource?: AsyncResource) => void;


export class ResourceDescriptor {
  static IMAGE: string = 'image';
  static AUDIO: string = 'audio';

  public sources: string[];

  constructor(
    public type: string,
    sources: string | ArrayLike<string>
  ) {
    if(!(sources instanceof Array)) {
      sources = [sources] as Array<string>;
    }
    this.sources = sources as Array<string>;
  }

  load(): Promise<AsyncResource> {
    switch(this.type) {
      case ResourceDescriptor.IMAGE:
        return new ImageResource().load(this.sources);
      case ResourceDescriptor.AUDIO:
        return new AudioResource().load(this.sources);
      default:
        throw new Error('Invalid ResourceDescriptor type');
    }
  }
}

export abstract class ResourceLoader {

  static async load(sources: ResourceDescriptor[], progress: progressCallback = (() => { /* noop */})): Promise<AsyncResource[]> {
    return new Promise<AsyncResource[]>((resolve: any, reject: any) => {
      const pool = new PromisePool();
      let loaded: number = 0;
      const resources: AsyncResource[] = [];

      pool.addEventListener('reject', (event: CustomEvent) => {
        pool.clear();
        reject(event.detail.error);
      });

      for(let i = 0; i < sources.length; i++) {
        pool.push(() => {
          return sources[i].load().then((data: any) => {
            resources[i] = data;
            progress(loaded++, sources.length, data);
          });
        });
      }

      if(pool.isComplete()) {
        resolve(resources);
      } else {
        pool.addEventListener('complete', () => {
          resolve(resources);
        });
      }
    });
  }


  static loadOld(source: string): Promise<AsyncResource> {
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
      return ResourceLoader.loadOld(sources[index]).catch((error) => {
        // console.warn(error);
        return ResourceLoader.loadWithAlternatives(sources, index + 1);
      });
    }
  }

  static async loadMany(sources: ResourceDescriptor[], progress: progressCallback = (() => { /* noop */})): Promise<AsyncResource[]> {
    let promises: Promise<AsyncResource>[] = [];
    let index: number = 0;
    let sourceAlternatives: string[];
    for(let i = 0; i < sources.length; i++) {
      sourceAlternatives = sources[i].sources;
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