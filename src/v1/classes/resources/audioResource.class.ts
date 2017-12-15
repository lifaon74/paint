import { AsyncResource } from './asyncResource.class';
import { ResourceHelper } from './resourceHelper.class';

// https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API
// https://developer.mozilla.org/fr/docs/Web/API/AudioListener
// https://developer.mozilla.org/fr/docs/Web/API/AudioContext

// https://webdesign.tutsplus.com/tutorials/web-audio-and-3d-soundscapes-introduction--cms-22650
// https://www.html5rocks.com/en/tutorials/webaudio/intro/

export class AudioResource extends AsyncResource {
  static load(source: string): Promise<AudioResource> {
    return new AudioResource().load(source);
  }

  static canPlayType(type: string): string {
    return new Audio().canPlayType(type);
  }

  static canPlaySource(source: string): string {
    return AudioResource.canPlayType(ResourceHelper.extensionToMimeType(ResourceHelper.pathToExtension(source)));
  }

  static async awaitLoaded(audio: HTMLAudioElement): Promise<HTMLAudioElement> {
    return new Promise<HTMLAudioElement>((resolve: any, reject: any) => {
      if(audio.readyState === (<any>HTMLAudioElement).HAVE_ENOUGH_DATA) {
        resolve(audio);
      } else {
        let load: any, error: any, clear: any;

        load = () => {
          clear();
          resolve(audio);
        };

        error = () => {
          clear();
          reject(new Error('Invalid resource path ' + audio.src));
        };

        clear = () => {
          audio.removeEventListener('loadeddata', load, false);
          audio.removeEventListener('error', error, false);
        };

        audio.addEventListener('loadeddata', load, false);
        audio.addEventListener('error', error, false);
      }
    });
  }

  public resource: HTMLAudioElement;

  constructor() {
    super();
    this.resource = new Audio();
  }

  async load(sources: string | ArrayLike<string>): Promise<this> {
    if(!(sources instanceof Array)) {
      sources = [sources] as Array<string>;
    }

    let i = 0, loaded: boolean = false;
    while((i < sources.length) && !loaded) {
      try {
        switch(AudioResource.canPlaySource(sources[i])) {
          case 'probably':
          case 'maybe':
            this.src = sources[i];
            await AudioResource.awaitLoaded(this.resource);
            loaded = true;
            break;
          case '':
          default:
            throw new Error('Can\'t load this extension');
        }
      } catch(error) {
        i++;
      }
    }
    if(!loaded) throw new Error('Invalid resource path ' + JSON.stringify(sources));
    return this;
  }

  async loadData(source: string): Promise<this> {
    return new Promise<this>((resolve: any, reject: any) => {
      const request = new XMLHttpRequest();
      request.open('GET', source, true);
      request.responseType = 'arraybuffer';

      const context = new AudioContext();

      const onLoad = () => {
        request.removeEventListener('load', onLoad, false);

        context.decodeAudioData(request.response).then((buffer: AudioBuffer) => {
          let source: AudioBufferSourceNode = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.start(0);
        });
      };

      request.addEventListener('load', onLoad, false);
      request.send();
    });
  }

  set src(source: string) {
    this.resource.src = source;
    this.resource.preload = 'auto';
    // this.resource.load();
    // this.resource.volume = 1;
    // this.resource.play();
  }



  play() {
    this.resource.play();
  }

  get volume(): number {
    return this.resource.volume;
  }

  set volume(volume: number) {
    this.resource.volume = volume;
  }
}