import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChatOptionsComponent } from './chat-options.component';

describe('ChatOptionsComponent', () => {
  let component: ChatOptionsComponent;
  let fixture: ComponentFixture<ChatOptionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ChatOptionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
