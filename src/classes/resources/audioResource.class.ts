import { AsyncResource } from './asyncResource.class';

export class AudioResource extends AsyncResource {
  static load(source: string): Promise<AudioResource> {
    return new AudioResource().load(source);
  }

  resource: HTMLAudioElement;

  constructor() {
    super();
    this.resource = new Audio();
    this.resource.preload = 'auto';
  }

  set src(source: string) {
    // this.resource.addEventListener('canplaythrough', () => {
    //   debugger;
    // });
    this.resource.src = source;
    // this.resource.preload = 'auto';
    // this.resource.load();
    // this.resource.volume = 1;
    // this.resource.play();
  }

  play(): void {
    this.resource.play();
  }

}