import { ImageResource } from './image/Image';

export class DataBase {

  static getUUID(): string {
    return Math.floor(Math.random() * 2**32).toString(16).padStart(8, '0')
      + '-' + Date.now().toString(16).padStart(16, '0');
  }

  private _data: Map<string, any>;

  constructor() {
    this._data = new Map<string, any>();
  }


  get<T>(id: string): Promise<T> {
    return Promise.resolve(this._data.get(id));
  }

  set<T>(item: T, id: string = DataBase.getUUID()): Promise<string> {
    this._data.set(id, item);
    return Promise.resolve(id);
  }

  delete(id: string): Promise<void> {
    this._data.delete(id);
    return Promise.resolve();
  }
}


export interface DBEntry<T> {
  type: string;
  data: T;
}

export class DBEntryResolver {

}


async function test() {
  const db = new DataBase();

  await db.set<DBEntry<ImageResource>>({ type: 'image', data: await ImageResource.fromURL('./images/templates/floors/grass_01.png') });


}


window.addEventListener('load', () => {
  test().catch(_ => console.error(_));
});