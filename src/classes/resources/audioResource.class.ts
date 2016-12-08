import { AsyncResource } from './asyncResource.class';

// https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API
// https://developer.mozilla.org/fr/docs/Web/API/AudioListener
// https://developer.mozilla.org/fr/docs/Web/API/AudioContext

// https://webdesign.tutsplus.com/tutorials/web-audio-and-3d-soundscapes-introduction--cms-22650
// https://www.html5rocks.com/en/tutorials/webaudio/intro/

export class AudioResource extends AsyncResource {
  static load(source: string): Promise<AudioResource> {
    return new AudioResource().load(source);
  }

  resource: HTMLAudioElement;

  constructor() {
    super();
    this.resource = new Audio();
  }

  load(source: string): Promise<AsyncResource> {
    return super.load(source, 'loadeddata');
  }

  set src(source: string) {
    this.resource.src = source;
    // this.resource.preload = 'auto';
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