# The Global Human Day

A scrollytelling infographic article exploring how people around the world spend their 24 hours. The project uses the [The Global Human Day](https://zenodo.org/records/7941615) dataset to visualise global time use across countries, regions, activities, and economic classifications.

Live site: https://git.arts.ac.uk/pages/j-tang1120251/the-global-human-day/<br/>
Backup site: https://tang-jiaxi.github.io/the-global-human-day/<br/>
Demo video: https://www.loom.com/share/593f70f24b1748248a3bd429deb20819

## Project overview

This project was created for the Computational Practices: Visualisation and Sensing unit at the University of Arts London. It uses data visualisation and scrollytelling to guide viewers through a narrative about how humanity spends time, from global averages to country-level comparisons.

The visualisation begins with an overview of the global human day, then explores themes such as population-scaled time, the connection between administrative time and socialising, as well as regional differences. At the end, viewers can freely explore the dataset through filterable bar charts.

## Repository contents

* `index.html`
  Main webpage containing the article structure, scrollytelling sections, visualisation containers, text, references, and script links.

* `global_human_day.csv`
  Dataset containing the global average time spent on different daily activity subcategories.

* `all_countries.csv`
  Original country-level dataset.
  
* `all_countries_extended.csv`
  Extended country-level dataset used for the interactive visualisations. This includes activity time, country names, ISO codes, population, GDP per capita, and economic status classification.

- `js/`  
  Contains all JavaScript files for the d3.js visualisations and Scrollama-based interactions used in the article.

* `.github/workflows/`
  Contains the GitHub Actions workflow used to deploy the static site to GitHub Pages.

## Technologies used

* HTML
* Tailwind CSS
* JavaScript
* d3.js
* Scrollama
* GitHub Actions
* GitHub Pages

## Deployment

The project is automatically deployed as a static website using GitHub Actions and GitHub Pages. The workflow publishes the HTML, CSS, JavaScript, and data files from this repository to the live GitHub Pages site. 

## Viewing notes

The final visualisation is best viewed fullscreen on a laptop or desktop browser. Alternatively, you may clone this repository and run a live server on the `index.html` page to view the website.

