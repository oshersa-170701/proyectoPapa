import { WebPlugin } from '@capacitor/core';

import type { ANAasisHealthPlugin } from './definitions';

export class ANAasisHealthWeb extends WebPlugin implements ANAasisHealthPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
