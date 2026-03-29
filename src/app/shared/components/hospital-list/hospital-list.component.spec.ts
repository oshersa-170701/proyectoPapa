import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HospitalListComponent } from './hospital-list.component';

describe('HospitalListComponent', () => {
  let component: HospitalListComponent;
  let fixture: ComponentFixture<HospitalListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HospitalListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HospitalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
