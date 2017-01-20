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

  resource: HTMLAudioElement;

  constructor() {
    super();
    this.resource = new Audio();
  }

  load(source: string): Promise<AsyncResource> {
    switch(AudioResource.canPlaySource(source)) {
      case 'probably':
      case 'maybe':
        return super.load(source, 'loadeddata');
      case '':
      default:
        return Promise.reject(new Error('Can\'t load this extension'));
    }
  }

  loadData(source: string): any {
    return new Promise((resolve:any, reject:any) => {
      let request = new XMLHttpRequest();
      request.open('GET', source, true);
      request.responseType = 'arraybuffer';

      let context = new AudioContext();

      let onLoad = () => {
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