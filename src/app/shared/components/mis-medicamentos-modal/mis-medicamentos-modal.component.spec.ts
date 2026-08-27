import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MisMedicamentosModalComponent } from './mis-medicamentos-modal.component';

describe('MisMedicamentosModalComponent', () => {
  let component: MisMedicamentosModalComponent;
  let fixture: ComponentFixture<MisMedicamentosModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MisMedicamentosModalComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MisMedicamentosModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
