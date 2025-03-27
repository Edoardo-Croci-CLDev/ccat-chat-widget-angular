import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetCcatComponent } from './widget-ccat.component';

describe('WidgetCcatComponent', () => {
  let component: WidgetCcatComponent;
  let fixture: ComponentFixture<WidgetCcatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetCcatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WidgetCcatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
