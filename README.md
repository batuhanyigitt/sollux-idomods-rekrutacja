# SOLLUX Studio CMS

**Osobny panel zarządzania treścią dla istniejącej strony SOLLUX**, inspirowany przepływem pracy Gutenberg + ACF. Frontend zachowuje projekt Figma, a edytor umożliwia zmianę treści bez edytowania kodu i bez ponownego generowania ZIP przy każdej publikacji.

## Dostępne funkcje

- **Panel:** `/studio/`, ekran logowania: `/studio/login.html`. To osobna strona i panel w tym samym serwisie, niewidoczny w nawigacji publicznej; dane i operacje CMS są chronione uwierzytelnianiem.
- **Podgląd na żywo:** kliknij tekst lub obraz w prawdziwej stronie w ramce i zmień go w inspektorze. Reakcja jest natychmiastowa.
- **Pola jak ACF:** tekst, adres linku, kolor, rozmiar fontu, obraz oraz kolory globalne.
- **Bloki jak Gutenberg:** dodaj *tekst*, *obraz + tekst* lub *CTA*, edytuj pola, zmień kolejność (↑/↓) lub ukryj blok.
- **Media:** PNG/JPEG/WebP/GIF/AVIF do 3 MB; obrazy są zapisywane na serwerze.
- **Szkice:** automatyczny zapis zmian w backendzie; nie są widoczne dla odwiedzających.
- **Publikacja:** przycisk **Opublikuj zmiany** przenosi szkic do wersji publicznej. Nowe wejścia zobaczą go od razu; otwarte karty strony publicznej odświeżają treść co około 8 sekund.
- **Historia edycji:** cofanie i ponawianie w bieżącej sesji. Eksport/import JSON jako kopia zapasowa.

## Lokalny start (macOS / Windows / Linux)

Wymagany: **Node.js 22.12+** (wymóg `@netlify/blobs` 11.x). Plik `.nvmrc` wybiera Node 22 na Netlify. Nie potrzeba instalacji zależności do uruchomienia prostego lokalnego serwera; dla wdrożenia Netlify zainstaluj zależności podczas buildu.

```bash
npm start
```

W trybie lokalnym otrzymasz stałe konto demonstracyjne **użytkownik: `admin` / hasło: `1`**. Działa wyłącznie na `127.0.0.1` i służy do szybkiego testowania. Otwórz:

- Publiczna strona: `http://127.0.0.1:4173/`
- Panel CMS: `http://127.0.0.1:4173/studio/`

Jeśli chcesz mieć stałe hasło pomiędzy restartami:

```bash
CMS_ADMIN_USERNAME='admin' CMS_ADMIN_PASSWORD='twoje-mocne-haslo' npm start
```

**Nie dodawaj hasła do GitHuba, README ani kodu.** Lokalna baza w `.cms-local/` jest ignorowana przez Git. Serwer nasłuchuje tylko na `127.0.0.1`.

## Publikacja na Netlify — istniejący projekt

> **Ważne:** wcześniejszy deploy wykonany przez Netlify Drop udostępniał wyłącznie pliki statyczne. Wersja CMS wymaga wdrożenia **Netlify Functions**, dlatego samo przeciągnięcie katalogu `dist` do Netlify nie wystarcza.

1. Prześlij ten projekt do repozytorium GitHub **bez `.env`, `.cms-local/` i `node_modules/`**. Zalecany jest osobny branch albo osobne repo dla CMS, aby nie nadpisać działającej wersji rekrutacyjnej przed sprawdzeniem wdrożenia.
2. W Netlify połącz repozytorium z istniejącym projektem (`Project configuration → Build & deploy → Continuous deployment`) albo użyj Netlify CLI do wdrożenia na tym samym projekcie.
3. W ustawieniach zmiennych środowiskowych projektu ustaw:
   - `CMS_ADMIN_USERNAME` — `admin` (lub inna wybrana nazwa użytkownika).
   - `CMS_ADMIN_PASSWORD` — długie, niepowtarzalne hasło (min. 12 znaków).
   - `CMS_SESSION_SECRET` — losowy sekret o długości min. 32 znaków (np. wynik `openssl rand -hex 32`).
   - **Wyłącznie do demonstracji na chronionym środowisku:** aby pozwolić na hasło `1`, ustaw również `CMS_ALLOW_WEAK_DEMO_PASSWORD=true`. **Ostrzeżenie:** `admin / 1` na publicznie dostępnej stronie umożliwia nieuprawnionym osobom zmianę i publikację treści. Zdecydowanie zaleca się długie hasło lub dodatkowe ograniczenie dostępu do strony.
4. Build command: `npm run build`, Publish directory: `dist`, Functions directory: `netlify/functions` (już zadeklarowane w `netlify.toml`). Upewnij się, że w logach buildu widnieje Node 22.12 lub nowszy.
5. Uruchom nowy deploy, upewnij się, że funkcja `cms` widoczna jest w panelu Functions. Otwórz `/studio/login.html`, zaloguj się i edytuj treść.
6. Zapisuj szkice i dopiero po zatwierdzeniu klikaj **Opublikuj**. Zmiany są zapisywane w Netlify Blobs (przetrwają następne deploye) i dostarczane przez funkcję — **bez automatycznych commitów do GitHub**.

### Alternatywnie — Netlify CLI

Po zalogowaniu i powiązaniu katalogu z istniejącą stroną:

```bash
npm install
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
```

**Nigdy nie umieszczaj zmiennych sekretów w repozytorium.** Dodaj je przez Netlify UI. Netlify Blobs jest dostępny w Functions; `@netlify/blobs` jest deklarowany w `package.json`.

## Struktura

```text
index.html                   strona główna
engineering.html i inne      podstrony showcase
assets/, css/, js/           oryginalny frontend + runtime CMS
studio/index.html            osobny panel edycyjny
studio/login.html            uwierzytelnianie
studio/editor.js             edycja WYSIWYG, zapis szkicu, publikacja
netlify/functions/cms.mjs    API produkcyjne + Netlify Blobs
cms-shared.mjs               walidacja, sesje, reguły bezpieczeństwa
dev-server.mjs               lokalny backend bez zależności
build.mjs                    przygotowanie statycznego katalogu dist/
qa/                          testy API
```

## Testy

```bash
npm test
npm run check
npm run build
```

## Zasady bezpieczeństwa i ograniczenia

- Konto administratora korzysta z nazwy użytkownika i hasła ustawianych po stronie serwera. Domyślnie lokalnie `admin / 1`; produkcja Netlify wymaga jawnej konfiguracji.
- API edycji używa podpisanej sesji w ciasteczku `HttpOnly`, `SameSite=Strict`, z wygaśnięciem po 12 godzinach. Sekret i hasło pozostają po stronie serwera.
- Dane są filtrowane: do HTML nie trafia niezweryfikowany kod, a blokom używany jest `textContent` zamiast HTML stringów.
- Przesyłane obrazy mają ograniczenie formatu i wielkości oraz sprawdzaną sygnaturę pliku.
- Panel obsługuje jednego administratora. Nie ma wieloskładnikowego logowania, ograniczania liczby prób hasła ani wbudowanego przywracania poprzedniej publikacji. Dla szeroko dostępnej strony warto dodać zewnętrzną warstwę kontroli dostępu i limitowanie żądań logowania.
- Dwa jednoczesne okna edycji tego samego szkicu mogą nadpisać sobie zmiany (*last write wins*). Rozbudowane wersjonowanie, role użytkowników, workflow zatwierdzania i wieloosobowa edycja **nie** są zaimplementowane.
- CMS nie modyfikuje plików Figma ani repozytorium. Dodatkowe bloki są renderowane jako moduły ponad stopką, bez modyfikacji oryginalnej struktury hero.
- To własny, niewielki CMS *inspirowany* Gutenberg/ACF, a **nie** instalacja WordPress, Gutenberg lub ACF.
- Testy API uruchomione lokalnie. Pełne testy w przeglądarce oraz produkcyjna konfiguracja Netlify wymagają osobnego sprawdzenia po wdrożeniu.

## Typografia

Red Hat Display jest ładowany przez oficjalny arkusz Google Fonts. W trybie offline używany jest systemowy font zastępczy; żaden plik binarny fontu nie jest dołączony do paczki.
