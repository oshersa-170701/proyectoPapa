import { TestBed } from '@angular/core/testing';

import { Overpass } from './overpass';

describe('Overpass', () => {
  let service: Overpass;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Overpass);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
