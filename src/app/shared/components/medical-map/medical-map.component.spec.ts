import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MedicalMapComponent } from './medical-map.component';

describe('MedicalMapComponent', () => {
  let component: MedicalMapComponent;
  let fixture: ComponentFixture<MedicalMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MedicalMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
