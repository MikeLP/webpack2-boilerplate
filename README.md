# Webpack2 (Babel) Boilerplate
### Create pretty applications based on latest Babel and PostCSS/SASS

## Getting Started

Lets install dependencies:

```bash
$ npm install
```

..or if you know about **yarn**

```bash
$ yarn
```

**P.S. You'll need to have Node >= 6 on your machine.**

## Creating an App

Inside that directory, it will contain the initial project structure

```
my-app/
  README.md
  node_modules/
  package.json
  .gitignore
  .babelrc
  .eslintrc
  public/
    favicon.ico
    index.html
  src/
     app/
      components/
        myComponent/
         index.js
         style.scss
     assets/
     images/
       example.png
       example2.jpg
     css/
       main.scss
     fonts/
       font.woff
       font.woff2
     index.js
```

### `$ npm start`

Runs the app in development mode.<br>
Open <http://localhost:3000> to view it in the browser.

The page will reload if you make edits.<br>
You will see the build errors and lint warnings in the console.

### `$ npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

### `$ npm run start:prod`

Starts production example server that looking on `build` folder.
The build is minified and the filenames include the hashes.<br>

Open <http://localhost:9000> to view it in the browser.


## CSS3 (SCSS) usage

```scss

// Feel free to use variables
$red: #ff1700;
$white: '#fff';


.test {
    background-color: $red;
    background-image: url('./cat.jpg');
    // Will be transformed automaticly by autoprefixer
    display: flex;
}

.myClass {
    border-radius: 10px;

    .myClass2 {
        color: $white;
    }
}
```

## JS (ES7) usage

Component example:

```
 components/
   Button/
     index.js
     style.scss
```

### index.js

```js
    import style from './style.scss'

    const template = `<div class="${style.myClass}"></div>`
```
