# SOLLUX — landing page + Studio CMS

Responsywna implementacja strony SOLLUX przygotowana na podstawie projektu Figma do zadania rekrutacyjnego **IdoMods — Frontend + AI Developer**. Projekt obejmuje publiczny landing page, pięć stron z dokumentacją interaktywną oraz **osobny panel administracyjny SOLLUX Studio** do wizualnego zarządzania treścią.

Frontend został napisany w **HTML, CSS i vanilla JavaScript**. Dodatkowy, autorski system CMS inspirowany sposobem pracy WordPress Gutenberg i ACF nie wymaga instalacji WordPressa. Zmiany treści są zapisywane w Netlify Blobs i publikowane bez ręcznego edytowania HTML ani ponownego przesyłania plików ZIP.

> **Dla osoby oceniającej:** zacznij od strony głównej, następnie otwórz przegląd techniczny i panel Studio. Dostęp do panelu wymaga danych logowania przekazywanych **oddzielną, prywatną wiadomością** — hasła nie ma w publicznym repozytorium.

## 1. Wszystkie adresy i mapa projektu

| Część projektu | Adres | Co można tam zobaczyć? |
| --- | --- | --- |
| **Strona główna SOLLUX** | https://sollux-batuhan-task.netlify.app/ | Oryginalny landing page, animowany hero, slider, sekcje produktowe, interakcje i RWD |
| **Engineering** | https://sollux-batuhan-task.netlify.app/engineering.html | Przegląd architektury i najważniejszych decyzji technicznych |
| **Experience** | https://sollux-batuhan-task.netlify.app/experience.html | Interaktywny pokaz elementów strony i zachowań interfejsu |
| **System** | https://sollux-batuhan-task.netlify.app/system.html | Kolory, typografia, komponenty, zasoby i zasady wizualne |
| **Quality** | https://sollux-batuhan-task.netlify.app/quality.html | Kontrole działania uruchamiane w przeglądarce |
| **Process** | https://sollux-batuhan-task.netlify.app/process.html | Etapy realizacji, przyjęte rozwiązania i ograniczenia |
| **Studio — logowanie** | https://sollux-batuhan-task.netlify.app/studio/login.html | Logowanie do CMS na podstawie nazwy użytkownika i hasła |
| **Studio — edytor** | https://sollux-batuhan-task.netlify.app/studio/ | Wizualna edycja treści, obrazów, kolorów i bloków |
| **Repozytorium GitHub** | https://github.com/batuhanyigitt/sollux-idomods-rekrutacja | Kod źródłowy, konfiguracja wdrożenia i niniejsza instrukcja |
| **Projekt Figma** | https://www.figma.com/design/0IEndSXVS1EK98fLXYNnYN/IdoMods-rekrutacja-frontend-AI?node-id=0-1 | Materiał referencyjny do zadania rekrutacyjnego |

**Ważne rozróżnienie:** Studio edytuje **publiczny landing page** (ścieżka `/`). Strony `engineering.html`, `experience.html`, `system.html`, `quality.html` i `process.html` są osobnymi stronami dokumentacyjnymi; ich zawartość nie jest edytowana przez aktualny panel CMS. Panel Studio nie jest elementem publicznego menu nawigacyjnego.

## 2. Jak działa publiczna strona?

- **Hero:** interaktywne lampy reagujące na kursor, animacje, paralaksa i sterowanie światłem.
- **Slider:** automatyczne przejścia, ręczna zmiana slajdów oraz pasek postępu. Zachowanie zostało dostosowane do urządzeń mobilnych.
- **Nawigacja i sekcje:** responsywne menu, układy produktowe, kafelki i przyciski z efektami interakcji.
- **WebGL/GLSL:** animowane tło wybranej sekcji z wariantem zastępczym, gdy urządzenie nie obsługuje WebGL.
- **Dostępność i RWD:** semantyczny HTML, obsługa klawiatury dla odpowiednich elementów i reguły dopasowania do szerokości ekranu.

Pięć podstron technicznych stanowi **dodatkowe opracowanie ponad wymagany landing page**. Są przeznaczone do oceny wdrożenia i zastosowanych rozwiązań, a nie do zarządzania treścią strony.

## 3. SOLLUX Studio — instrukcja krok po kroku

### 3.1. Logowanie

1. Otwórz: **https://sollux-batuhan-task.netlify.app/studio/login.html**.
2. Wprowadź nazwę użytkownika i hasło otrzymane w prywatnej wiadomości.
3. Wybierz **Zaloguj się do panelu**.
4. Po pomyślnym uwierzytelnieniu zostaniesz przeniesiony do `/studio/`.

Dane logowania są konfigurowane **po stronie Netlify**. Nie trzeba zakładać konta WordPress ani instalować żadnego oprogramowania. Sesja administratora jest przechowywana w podpisanym ciasteczku i wygasa po 12 godzinach.

### 3.2. Układ edytora

Panel jest podzielony na trzy części:

1. **Lewy panel:** zakładki `Treści`, `Obrazy`, `Kolory`, `Bloki`, `Publikacja`.
2. **Środkowy obszar:** rzeczywista strona SOLLUX w podglądzie na żywo. Możesz przełączać szerokości **Desktop / Tablet / Mobile**.
3. **Prawy inspektor:** właściwości zaznaczonego elementu, np. tekst, kolor, wielkość fontu, adres linku lub obraz.

Kliknij tekst albo obraz w środkowym podglądzie, aby wybrać element, lub znajdź go w lewej zakładce. Zmiana pola w inspektorze od razu aktualizuje podgląd.

### 3.3. Zmiana tekstu i linków

1. Otwórz `Treści` lub wybierz dany tekst w podglądzie.
2. Zmień treść w prawym inspektorze.
3. W przypadku elementów z linkiem możesz zmienić jego docelowy adres.
4. Jeżeli element udostępnia ustawienia stylu, dopasuj kolor i wielkość czcionki.
5. Sprawdź efekt w podglądzie Desktop / Tablet / Mobile.

### 3.4. Zmiana obrazów

1. Wejdź do `Obrazy` albo kliknij obraz w podglądzie.
2. Wybierz plik z komputera lub wpisz odpowiedni adres URL.
3. Dozwolone formaty uploadu: **PNG, JPEG, WebP, GIF i AVIF**.
4. Maksymalny rozmiar pojedynczego przesyłanego pliku: **3 MB**.
5. Obraz zostaje zapisany na serwerze i pojawia się w podglądzie; ostateczna publikacja wymaga użycia przycisku publikowania.

### 3.5. Kolory

W zakładce `Kolory` można zmieniać globalne zmienne CSS wykorzystywane przez stronę. Zmiany dotyczą elementów, które korzystają z tych zmiennych. Dodatkowo prawy inspektor umożliwia ustawianie stylów wybranego elementu.

### 3.6. Bloki — sposób pracy inspirowany Gutenberg

1. Otwórz zakładkę `Bloki`.
2. Wybierz jeden z typów: **Tekst / opis**, **Obraz + tekst**, **CTA / przycisk**.
3. Kliknij `Dodaj blok`.
4. Edytuj tytuł, opis, obraz, kolory i — jeśli dotyczy — link przycisku.
5. Użyj przycisków **↑ / ↓**, aby zmienić kolejność; blok można także ukryć lub usunąć.

Nowe bloki są renderowane jako moduły w części strony **przed stopką**; nie jest to swobodny edytor układu wszystkich istniejących sekcji Figma. Limit w aktualnej wersji: **40 bloków**.

### 3.7. Szkic, automatyczny zapis i publikacja

**Podgląd na żywo ≠ wersja publiczna.**

1. Zmiany są widoczne od razu w edytorze.
2. CMS automatycznie zapisuje je na serwerze jako **szkic**.
3. Po sprawdzeniu efektu kliknij **Opublikuj zmiany** lub w `Publikacja` wybierz **Opublikuj teraz**.
4. Dopiero ta operacja przenosi szkic do wersji widocznej na publicznej stronie.
5. Nowi odwiedzający pobierają opublikowaną treść po wejściu na stronę. Otwarte karty publicznej strony synchronizują ją okresowo — mniej więcej co **8 sekund**, gdy karta jest aktywna.

W zakładce `Publikacja` dostępne są także **eksport szkicu do JSON** i **import JSON**. Kopia JSON to kopia modelu treści, a nie archiwum całego kodu strony. W bieżącej sesji można korzystać z cofania/ponawiania. Przycisku `Przywróć oryginał` używaj ostrożnie: przywraca domyślną zawartość w edytorze; zmiana może zostać zapisana jako szkic i następnie opublikowana.

### 3.8. Wylogowanie

Otwórz zakładkę `Publikacja` i wybierz **Wyloguj się**.

## 4. Architektura i przepływ danych

```text
Przeglądarka odwiedzającego
    │
    └── Strona główna HTML/CSS/JS
           └── cms-public.js → GET published
                                 │
Netlify Functions ───────────────┼── Netlify Blobs: wersja opublikowana
           ▲                     │
           │                     └── osobny zapis danych produkcyjnych / podglądowych
           │
Studio CMS (wymaga logowania)
    ├── podgląd WYSIWYG
    ├── automatyczny zapis → draft
    ├── przesyłanie obrazów
    └── „Opublikuj” → published
```

- **Frontend:** HTML5, CSS3, JavaScript, WebGL/GLSL.
- **Panel:** `studio/index.html` + `studio/editor.js` + `studio/editor.css`.
- **Warstwa treści:** `js/content-runtime.js` i `js/cms-public.js`.
- **API:** `netlify/functions/cms.mjs`, walidacja i sesje w `cms-shared.mjs`.
- **Przechowywanie:** Netlify Blobs; produkcja i deploy preview używają osobnych nazw magazynów.
- **Build:** `build.mjs` tworzy `dist/`; Netlify Functions są wdrażane oddzielnie.
- **Aktualizacje treści:** nie wymagają commitów do GitHuba. **Aktualizacje kodu** wymagają normalnego wdrożenia nowej wersji.

## 5. Uruchomienie lokalne

Wymagania: **Node.js 22.12+**, npm. Klonuj repozytorium i uruchom:

```bash
git clone https://github.com/batuhanyigitt/sollux-idomods-rekrutacja.git
cd sollux-idomods-rekrutacja
npm install
npm start
```

Otwórz:
- Frontend: **http://127.0.0.1:4173/**
- Panel: **http://127.0.0.1:4173/studio/**

Wyłącznie do lokalnej demonstracji domyślny login to `admin`, a hasło to `1`. **Te dane nie dotyczą Netlify production.** Można ustawić inne dane lokalnie przez zmienne środowiskowe. Dane robocze lokalnego CMS są zapisywane w `.cms-local/` (folder nie jest dodawany do Git).

### Kontrola kodu i testy

```bash
npm run check
npm test
npm run build
```

**Uwaga dotycząca obecnego testu:** plik `qa/cms-api.test.mjs` uruchamia lokalny serwer z katalogu wyznaczonego na podstawie ścieżki URL; przy katalogach ze spacją w nazwie (np. `sollux-cms-studio 2`) może to powodować błąd `Server failed to start`. Do lokalnych testów użyj katalogu bez spacji. Zakończony build nie jest równoznaczny z ukończeniem pełnych testów przeglądarkowych.

## 6. Wdrożenie i konfiguracja Netlify

Repozytorium: **https://github.com/batuhanyigitt/sollux-idomods-rekrutacja**

Docelowy projekt Netlify: **sollux-batuhan-task**.

| Parametr | Wartość |
| --- | --- |
| Branch produkcyjny | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Konfiguracja | `netlify.toml` |
| Minimalna wersja Node | `22.12` |

Zmienne środowiskowe ustawiane w panelu Netlify, **nigdy w publicznym repozytorium**:

| Zmienna | Przeznaczenie |
| --- | --- |
| `CMS_ADMIN_USERNAME` | Nazwa administratora |
| `CMS_ADMIN_PASSWORD` | Hasło administratora, co najmniej 12 znaków |
| `CMS_SESSION_SECRET` | Losowy sekret sesji, co najmniej 32 znaki |

Po zmianie zmiennych Netlify wykonaj nowy deploy, aby funkcje otrzymały nowe ustawienia. Wdrożenie kodu przez GitHub wyzwala normalny proces build/deploy, jeżeli projekt jest podłączony do repozytorium.

**Nie udostępniaj hasła lub `CMS_SESSION_SECRET` w GitHubie, pliku README, issue, publicznym zrzucie ekranu ani w załącznikach z kodem.** Konto udostępnione do oceny należy wyłączyć lub zmienić jego hasło po zakończeniu testów.

## 7. Struktura katalogów

```text
index.html                   landing page
engineering.html             przegląd techniczny
experience.html              demonstracja interakcji
system.html                  design system
quality.html                 kontrole jakości w przeglądarce
process.html                 dokumentacja procesu
assets/                      grafiki, ikony, fonty
css/                         CSS strony i dokumentacji
js/main.js                   nawigacja, slider, interakcje
js/shader.js                 animacja WebGL
js/content-runtime.js        nakładanie zmian treści
js/cms-public.js             pobieranie opublikowanej zawartości
studio/index.html            panel edycyjny
studio/login.html            ekran logowania
studio/editor.js             zachowanie edytora
studio/editor.css            style edytora
netlify/functions/cms.mjs    produkcyjne API CMS
cms-shared.mjs               walidacja, sesje, bezpieczeństwo
dev-server.mjs               lokalny serwer aplikacji
build.mjs                    generowanie katalogu dist/
netlify.toml                 konfiguracja hostingu
qa/                          automatyczne testy API
```

## 8. Historia pracy z AI i dokumentacja procesu

Podczas zadania wykorzystywano narzędzia AI do analizy materiałów, iteracyjnego opracowania interfejsu i rozwiązywania problemów technicznych. **Zanonimizowany oryginalny eksport rozmowy z etapu tworzenia landing page’a** jest przekazywany **oddzielnie** jako plik JSON, ponieważ może zawierać szczegółowy przebieg pracy oraz zdarzenia użycia narzędzi.

- Plik rozmowy **nie jest częścią bieżącego publicznego repozytorium**.
- Eksport zachowuje oryginalną kolejność wiadomości i zapis zdarzeń narzędziowych; dane osobowe i wrażliwe zostały zredagowane.
- Eksport dotyczy wskazanej rozmowy z realizacji strony; **późniejsze prace nad CMS nie są automatycznie ujęte w tym samym pliku**.
- Dokumentacji podstron `engineering`, `experience`, `system`, `quality` i `process` można użyć do przeglądu rozwiązań i procesu, ale nie zastępuje ona pełnej historii konwersacji AI.

Konkretne narzędzia, skills, pluginy i wywołania MCP należy oceniać na podstawie faktycznych zapisów w dostarczonym eksporcie, a nie deklaracji o ich użyciu bez potwierdzenia.

## 9. Ograniczenia i zalecenia

- To **autorski lekki CMS**, nie WordPress, ACF ani Gutenberg.
- Obecna wersja zarządza treścią strony głównej; nie jest edytorem wszystkich stron serwisu.
- Obsługiwane jest jedno konto administratora, bez rozbudowanych ról i współpracy w czasie rzeczywistym.
- Brak wbudowanego MFA, ograniczania liczby prób logowania i historii wszystkich opublikowanych wersji.
- Jednoczesna edycja z dwóch kart może spowodować nadpisanie szkicu ostatnim zapisem.
- Kopia JSON jest przydatna przed większymi zmianami. Nie zastępuje systemu wersjonowania Git ani kopii plików multimedialnych.
- Podstrona Quality udostępnia kontrole przeglądarkowe, nie pełny certyfikowany audyt WCAG.
- Publikacja CMS zależy od prawidłowej konfiguracji Netlify Functions i Netlify Blobs.

---

**Autor:** Batuhan Yiğit  
**Kontekst:** IdoMods — zadanie rekrutacyjne Frontend + AI Developer  
**Zasada:** publiczny frontend + osobny edytor + techniczna dokumentacja + oddzielnie przekazana historia pracy z AI.
