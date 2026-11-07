# SOLLUX — zadanie rekrutacyjne Frontend + AI Developer

Implementacja responsywnego landing page’a na podstawie projektu Figma przygotowanego na potrzeby rekrutacji do **IdoMods**. Rozwiązanie zostało zbudowane w **HTML, CSS i JavaScript**, bez frameworków, procesu kompilacji ani zależności produkcyjnych.

Dodatkowo przygotowałem **interaktywną dokumentację projektu** — osobny zestaw stron pokazujących zastosowane rozwiązania, zachowanie interfejsu, system wizualny i metody weryfikacji. Dokumentacja stanowi rozszerzenie zadania; nie jest częścią oryginalnego projektu Figma.

## Podgląd

- **Landing page:** https://sollux-batuhan-task.netlify.app/
- **Przegląd techniczny:** https://sollux-batuhan-task.netlify.app/engineering.html
- **Projekt w Figma:** https://www.figma.com/design/0IEndSXVS1EK98fLXYNnYN/IdoMods-rekrutacja-frontend-AI?node-id=0-1

## Uruchomienie lokalne

**Wymagania:** aktualna przeglądarka internetowa oraz — w zalecanym wariancie — Python 3 lub inny prosty serwer HTTP. Nie trzeba instalować Node.js ani uruchamiać `npm install`.

1. Pobierz lub sklonuj repozytorium.
2. Otwórz terminal w katalogu, w którym znajduje się `index.html`.
3. Uruchom serwer lokalny:

   ```bash
   python3 -m http.server 8080
   ```

4. Otwórz **http://localhost:8080/** w przeglądarce.

Alternatywnie można skorzystać z rozszerzenia **Live Server** w Visual Studio Code. Serwer HTTP jest zalecany ze względu na podglądy osadzane w ramkach `iframe` w dokumentacji projektu.

## Zastosowane technologie

| Obszar | Rozwiązanie |
| --- | --- |
| Struktura | Semantyczny HTML5 |
| Warstwa wizualna | CSS3, responsywny układ, animacje i przejścia |
| Interakcje | Vanilla JavaScript, bez bibliotek UI |
| Efekty graficzne | WebGL i shader GLSL |
| Typografia | Red Hat Display, lokalny plik WOFF2 |
| Publikacja | Statyczny hosting Netlify |

## Najważniejsze funkcjonalności

- **Interaktywny hero:** trzy lampy reagujące na ruch kursora, efekt paralaksy i możliwość sterowania światłem.
- **Slider:** automatyczne przejścia, animowany wskaźnik postępu oraz zmiana slajdów.
- **Nawigacja:** obsługa menu na komputerach i urządzeniach mobilnych.
- **Kafelki:** przejścia i animacje aktywowane interakcją użytkownika.
- **WebGL:** animowane tło sekcji z uwzględnieniem ograniczeń urządzenia i preferencji ograniczonego ruchu.
- **RWD:** układ przystosowany do różnych szerokości ekranów.

## Dodatkowa dokumentacja interaktywna

| Plik | Zawartość |
| --- | --- |
| `engineering.html` | Przegląd realizacji i rozwiązań technicznych |
| `experience.html` | Laboratorium interakcji — sterowanie sceną i podgląd w różnych szerokościach |
| `system.html` | System projektowy — kolory, typografia, komponenty i zasoby |
| `quality.html` | Kontrole jakości uruchamiane w przeglądarce |
| `process.html` | Proces pracy, decyzje techniczne i ograniczenia |

Kontrole na stronie `quality.html` wykonują się lokalnie w przeglądarce. Nie są zamiennikiem audytu dostępności WCAG, pomiaru Lighthouse ani testów w pełnej macierzy urządzeń.

## Struktura katalogów

```text
.
├── index.html               # Landing page
├── engineering.html         # Przegląd techniczny
├── experience.html          # Laboratorium interakcji
├── system.html              # System projektowy
├── quality.html             # Kontrole jakości
├── process.html             # Proces realizacji
├── css/
│   ├── style.css            # Styl strony głównej
│   └── showcase.css         # Styl dokumentacji
├── js/
│   ├── main.js              # Nawigacja, slider i interakcje z lampami
│   ├── shader.js            # Efekt WebGL
│   ├── showcase.js          # Interakcje stron dokumentacji
│   ├── lab.js               # Laboratorium interakcji
│   └── quality.js           # Kontrole w przeglądarce
└── assets/                  # Obrazy, ikony, fonty i informacje o licencji
```

## Założenia i ograniczenia

- Priorytetem była zgodność z udostępnionym projektem, zachowaniem opisanym w komentarzach oraz prostota wdrożenia.
- Część materiałów graficznych odtworzono na podstawie dostępnych podglądów; nie są one deklarowane jako oryginalne zasoby wyeksportowane z Figma.
- Efekt WebGL wymaga obsługi WebGL przez przeglądarkę; w przypadku braku obsługi pozostaje wizualny wariant zastępczy oparty na CSS.
- Materiały projektowe zostały wykorzystane wyłącznie na potrzeby zadania rekrutacyjnego.

## Współpraca z AI

Narzędzia AI zostały wykorzystane podczas analizy projektu, implementacji i iteracyjnego rozwiązywania problemów. **Pełne, odpowiednio zanonimizowane zapisy rozmów oraz informacje o użytych narzędziach, skillach, pluginach i serwerach MCP zostaną przekazane oddzielnie** jako część końcowego zgłoszenia. Nie są częścią bieżącej wersji repozytorium zawierającej sam kod.

---

**Autor:** Batuhan Yiğit  
**Kontekst:** zadanie rekrutacyjne IdoMods — Frontend + AI Developer
