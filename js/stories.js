"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();
  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  return $(`
      <li id="${story.storyId}">
        <i class="far fa-star hidden"></i>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");
  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
    if (currentUser) {
      checkIfStoryIsFavorited(story);
      addUserStoryElements(story);
      unhideStars();
    }
  }
  $allStoriesList.show();
}

function checkIfStoryIsFavorited(story) {
  let favorited = false;
  for (let favoriteStory of currentUser.favorites) {
    if (favoriteStory.storyId === story.storyId) {
      favorited = true;
    }
  }
  if (favorited) {
    $(`#${story.storyId}`).addClass('favorited');
    $(`#${story.storyId} > i`).removeClass('far').addClass('fas');
  }
}

function addUserStoryElements(story) {
  if (story.username === currentUser.username) {
    $(`#${story.storyId}`).addClass('myStory');
    $(`#${story.storyId}`).append('<button class="delete-story-button hidden">Delete</button>');
  }
}

function unhideStars() {
  $('.fa-star').show();
}

async function newStorySubmitted(evt) {
  evt.preventDefault();
  // get form values:
  const title = $("#new-story-title").val();
  const author = $("#new-story-author").val();
  const url = $("#new-story-url").val();
  // send story info to API and add to running storyList
  const newStory = await storyList.addStory(currentUser, {title, author, url});
  // add story to html
  const $newStoryMarkup = generateStoryMarkup(newStory);
  $allStoriesList.prepend($newStoryMarkup);
  // clear form
  $("#new-story-form").trigger("reset");
  // navigate back to landing page
  navAllStories();
}

$("#new-story-form").submit(newStorySubmitted);

async function addFavoriteClick(evt) {
  const storyId = evt.target.parentElement.id;
  // update visual star to filled star
  $(`#${storyId} > i`).removeClass('far').addClass('fas');
  // add to User's favorites list
  currentUser.favorites.push(findStoryFromId(storyId));
  // send new favorite info to API
  await currentUser.addtoFavorites(storyId);
}

$body.on('click', '.far', addFavoriteClick);

async function removeFavoriteClick(evt) {
  const storyId = evt.target.parentElement.id;
  // update visual star to empty star
  $(`#${storyId} > i`).removeClass('fas').addClass('far');
  // remove from User's favorites list
  const index = findIndexOfStoryInFavorites(storyId);
  if (index !== -1) {
    currentUser.favorites.splice(index, 1);
  }
  // remove favorite info from API
  await currentUser.removeFromFavorites(storyId);
}

$body.on('click', '.fas', removeFavoriteClick);

/** From the story ID find the story instance to add to or remove from favorited list */

function findStoryFromId(storyId) {
  for (let story of storyList.stories) {
    if (story.storyId === storyId) {
      return story;
    }
  }
}

function findIndexOfStoryInFavorites(storyId) {
  for (let i = 0; i < currentUser.favorites.length; i++) {
    if (currentUser.favorites[i].storyId === storyId) {
      return i;
    } 
  }
}

async function deleteStoryClick(evt) {
  deleteStoryFromDom(evt.target.parentElement);
  deleteStoryFromStoryList(evt.target.parentElement.id);
  await deleteStoryFromApi(evt.target.parentElement.id);
}

$body.on('click', '.delete-story-button', deleteStoryClick);

function deleteStoryFromDom (domElement) {
  domElement.remove();
}

function deleteStoryFromStoryList(storyId) {
  for (let i = 0; i < storyList.stories.length; i++) {
    if (storyList.stories[i].storyId === storyId) {
      storyList.stories.splice(i, 1);
      break;
    }
  }
}

async function deleteStoryFromApi (storyId) {
  const data = {data: {token: currentUser.loginToken}};
  const res = await axios.delete(`${BASE_URL}/stories/${storyId}`, data);
  console.log(res);
}