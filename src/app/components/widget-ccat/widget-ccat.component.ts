import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
  Input,
  SimpleChanges,
  OnChanges,
  inject,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatClient } from 'ccat-api';
import { trigger, state, style, animate, transition, keyframes } from '@angular/animations';

type ChatType = 'streaming' | 'chat';

interface Message {
  text: string;
  sender: 'user' | 'bot' | 'bot_writing';
}

@Component({
  selector: 'app-widget-ccat',
  templateUrl: './widget-ccat.component.html',
  styleUrls: ['./widget-ccat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('hoverWiggle', [
      state('inactive', style({ transform: 'rotate(0deg)' })),
      state('active', style({ transform: 'rotate(0deg)' })),
      transition('inactive <=> active', [
        animate(
          '700ms ease-in-out',
          keyframes([
            style({ transform: 'rotate(0deg)', offset: 0 }),
            style({ transform: 'rotate(30deg)', offset: 0.2 }),
            style({ transform: 'rotate(-30deg)', offset: 0.4 }),
            style({ transform: 'rotate(10deg)', offset: 0.6 }),
            style({ transform: 'rotate(-10deg)', offset: 0.8 }),
            style({ transform: 'rotate(0deg)', offset: 1 }),
          ])
        ),
      ]),
    ]),
    trigger('hoverScale', [
      state('inactive', style({ transform: 'scale(1)' })),
      state('active', style({ transform: 'scale(1.2)' })),
      transition('inactive <=> active', [
        animate(
          '400ms ease-in-out',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.2)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class WidgetCcatComponent implements OnInit, AfterViewChecked {
  @Input() baseUrl = 'localhost';
  @Input() port = 1865;
  @Input() userId = 'user';
  @Input() secure = false;
  @Input() chatType: ChatType = 'streaming'; // Input per il tipo di chat

  @Input() initialPhrase = 'Ciao Sono lo Stregatto, una intelligenza artificiale curiosa e cortese. Come posso aiutarti?';
  @Input() sorryPhrase = 'Ops... il gatto ha avuto qualche problema';
  @Input() agentName = 'My cheshire-cat-ai';
  @Input() imgSrc = 'https://cheshire-cat-ai.github.io/docs/assets/img/cheshire-cat-logo.svg';
  @Input() imgAlt = 'ccat logo';
  @Input() showChatTop = true;

  @Input() userMessageBgColor = '#fee600'; // Colore di default (sfondo) per i messaggi utente
  @Input() userMessageTextColor = '#000000'; // Colore di default (testo) per i messaggi utente
  @Input() botMessageBgColor = '#000000'; // Colore di default (sfondo) per i messaggi bot
  @Input() botMessageTextColor = '#ffffff'; // Colore di default (testo) per i messaggi utente
  @Input() chatContainerBgColor = '#f3f6fc'; // Colore di default sfondo chat
  @Input() chatBodyTopBottomBorderColor = '#eeeeee'; // Colore di default dei bordi che separano il corpo della chat dal suo header e footer
  @Input() sendBtnBgColor = '#000000'; // Colore di default dei bordi che separano il corpo della chat dal suo header e footer

  isHovered = false;
  canAnimate = true;
  isOpenChat = false;
  isProcessing = false;
  gattoAttivo = false;

  @ViewChild('messagesContainerRef') messagesContainerRef!: ElementRef;

  messages: Message[] = [];
  input = '';
  cat: any;
  currentBotResponse = '';

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  constructor() {}

  ngOnInit(): void {
    this.updateCustomStyles();
    this.initCCATClient();
  }

  private updateCustomStyles(): void {
    // Applica stili personalizzati tramite CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--user-message-bg-color', this.userMessageBgColor);
    root.style.setProperty('--user-message-text-color', this.userMessageTextColor);
    root.style.setProperty('--bot-message-bg-color', this.botMessageBgColor);
    root.style.setProperty('--bot-message-text-color', this.botMessageTextColor);
    root.style.setProperty('--chat-container-bg-color', this.chatContainerBgColor);
    root.style.setProperty('--chat-body-top-bottom-border-color', this.chatBodyTopBottomBorderColor);
    root.style.setProperty('--send-btn-bg-color', this.sendBtnBgColor);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainerRef.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch {}
  }

  private initCCATClient(): void {
    // Disconnetti il client esistente se presente
    if (this.cat) {
      this.cat.close();
    }

    // Riconnetti con i nuovi parametri
    this.cat = new CatClient({
      host: this.baseUrl,
      port: this.port,
      userId: this.userId,
      secure: this.secure,
    })
      .onConnected(() => {
        this.gattoAttivo = true;
        this.messages = [{ text: this.initialPhrase, sender: 'bot' }];
        this.cat.api.memory.wipeConversationHistory();
      })
      .onError((err: any) => {
        console.error('Connection error:', err);
        this.gattoAttivo = false;
        this.messages = [{ text: this.sorryPhrase, sender: 'bot' }];
      });
  }

  async sendMessage(): Promise<void> {
    if (!this.input.trim() || !this.gattoAttivo) return;

    const userMessage = this.input.trim();
    this.messages.push({ text: userMessage, sender: 'user' });
    this.messages.push({ text: '', sender: 'bot_writing' });

    // Gestione diversificata in base al chatType
    if (this.chatType === 'streaming') {
      this.sendStreamingMessage(userMessage);
    } else {
      this.sendChatMessage(userMessage);
    }
  }

  private sendStreamingMessage(userMessage: string): void {
    this.isProcessing = true;
    this.input = '';
    this.currentBotResponse = '';

    const botMessageIndex = this.messages.length - 1;

    try {
      this.cat.send({ text: userMessage });

      this.cat
        .onMessage((msg: any) => {
          if (msg.type !== 'chat_token') return;

          const token = msg.content;

          // Controllo inizio streaming
          if (token === '') {
            // Fine streaming
            if (this.currentBotResponse) {
              this.messages.splice(botMessageIndex, 1);
              this.messages.push({
                text: this.currentBotResponse,
                sender: 'bot',
              });
              this.isProcessing = false;
              this.ngZone.run(() => {
                // Operazioni che richiedono rilevamento modifiche
                this.cdr.detectChanges();
              });
            }
            return;
          }

          // Accumula risposta
          this.currentBotResponse += token;
          this.messages[botMessageIndex] = {
            text: this.currentBotResponse,
            sender: 'bot',
          };

          this.ngZone.run(() => {
            // Operazioni che richiedono rilevamento modifiche
            this.cdr.detectChanges();
          });
        })
        .onDisconnected(() => {
          console.log('Socket disconnected');
          this.isProcessing = false;
        })
        .onError((err: any) => {
          console.error('Socket error:', err);
          this.messages.splice(botMessageIndex, 1);
          this.messages.push({ text: this.sorryPhrase, sender: 'bot' });
          this.isProcessing = false;
        });
    } catch (error) {
      console.error('Message sending error:', error);
      this.messages.splice(botMessageIndex, 1);
      this.messages.push({ text: this.sorryPhrase, sender: 'bot' });
      this.isProcessing = false;
    }
  }

  private sendChatMessage(userMessage: string): void {
    this.isProcessing = true;
    this.input = '';
    this.currentBotResponse = '';

    const botMessageIndex = this.messages.length - 1;

    try {
      this.cat.send({ text: userMessage });

      this.cat
        .onMessage((msg: any) => {
          if (msg.type !== 'chat') return;

          this.messages.splice(botMessageIndex, 1);
          this.messages.push({
            text: msg.content,
            sender: 'bot',
          });
          this.isProcessing = false;
          this.ngZone.run(() => {
            // Operazioni che richiedono rilevamento modifiche
            this.cdr.detectChanges();
          });
        })
        .onDisconnected(() => {
          console.log('Socket disconnected');
          this.isProcessing = false;
        })
        .onError((err: any) => {
          console.error('Socket error:', err);
          this.messages.splice(botMessageIndex, 1);
          this.messages.push({ text: this.sorryPhrase, sender: 'bot' });
          this.isProcessing = false;
        });
    } catch (error) {
      console.error('Message sending error:', error);
      this.messages.splice(botMessageIndex, 1);
      this.messages.push({ text: this.sorryPhrase, sender: 'bot' });
      this.isProcessing = false;
    }
  }

  toggleChat(): void {
    this.isOpenChat = !this.isOpenChat;
  }
}
