import { TestBed } from '@angular/core/testing';

import { Medical } from './medical';

describe('Medical', () => {
  let service: Medical;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Medical);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
