## Story Book Language Learning App

Story Book is a language learning app that allows the user to learn a foreign language by reading selected texts/books with the original English and a foreign translation provided side-by-side. If the screen is small format (phone portrait) then the text and its translation should be interlaced.

The app has the following options:
- the language to be translated (initially French, German, Spanish, Russian)
- language model used (one of ChatGPT's 5 series)
- the story to read
  - these will be available in plain text formats in a books folder
  - seed these with the top ten books from Project Gutenberg (https://www.gutenberg.org/) in plain text format.

We will use OpenAI's API using an environment key provided. This will be used to:
- translate the current page in the selected language.
- provide audio of the translated text
  - there should be an option to listen to this audio.

## Adding Authentication and the Database

We'll use a `sqlite` database for this project.

We will authenticate users with `Better-Auth' (https://www.better-auth.com/). As well as all necessary auth based fields the database schema should have:

- `users` - User accounts (id, username, etc.)
- `reading-session` - this is a book reading (id, user_id, book_id, book_marks, notes, language )
- `books` - a book in the database with (id, title, author, translations)
- `book-mark` - a position in a book with optional notes (id, book_id, place, notes)
- `translation` - a book translation which is updated lazily. Use ffmpeg to compress the audio for saving. (id, book_id, language, audio, text)

We will be using basic auth:
- you can find out how to install it [here](https://www.better-auth.com/docs/installation)
- details of integrating that with Svelte can be found [here](https://www.better-auth.com/docs/integrations/svelte-kit)

The front-page of the web-site should now have a user registration/login page. Successful login takes the user to the geo-projector mapping page.

The database should be seeded with a test user:
- name: kyran, password: storybook

Use this test user to make a basic intergration test use Playwright that tests the log-in page.

Add logging to the project so you can get feedback about the work-flow by using `make tail-log`

## Dev book
For dev purposes provide one pre-cached book translated into Russian with the first 20 pages translated a audio cached.

## Phonetic guide
Provide a switch button which adds phonetic pronunciation text to the translated sentences.

## Reading experience
The reading interface should be paginated with page turns initiated by clicking on forward/backward navigation buttons or an active zone at the page edges.

**Clicking on the text should highlight the sentence and it's translation**


## Adding some book art
This covers the /library endpoint.

The available books should be smaller, width 200px. Adjust the font-sizes to fit. We would like some book-cover-art. Try to find some starting with project Gutenberg (gutenberg.org).

## Read by sentence or paragraph

We want to offer the option of reading by paragraph (as currently) or by sentence.

If reading by sentence is chosen we want the option to select multiple languages that can appear at the same time with optional phonetic guide as already available.

This means a book reading session can have multiple languages. As before make sure the text and audio translations are cached in the database to reduce calls to OpenAI's API.

In the read by sentence mode:
- the sentences and their translations are stacked horizontally:
- Use ISO three code (e.g. FRA, GDR...) , colored language chips to indicate the language of the translated sentence.


## Implement language dictionaries
Download the best language dictionaries available:
- Display an English translation on mouseover a foreign word.
- Display a foreign word if mouseover an English word.
- In sentence mode show translated words for all selected languages.
