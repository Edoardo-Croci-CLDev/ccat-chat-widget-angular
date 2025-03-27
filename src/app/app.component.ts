import { Component } from '@angular/core';
import { WidgetCcatComponent } from './components/widget-ccat/widget-ccat.component';

@Component({
  selector: 'app-root',
  imports: [WidgetCcatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'widget-ccat-angular';
}
