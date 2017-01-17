export abstract class ResourceHelper {

  static extensionToMimeType(extension: string): string {
    // https://github.com/jshttp/mime-db
    switch(extension) {
      case 'mp3':
        return 'audio/mpeg';
      case 'ogg':
        return 'audio/ogg';
      default:
        return null;
    }
  }

  static pathToExtension(path: string): string {
    let extension = /[^.]*\.([^.]+)$/.exec(path);
    return extension ? extension[1] : null;
  }
}