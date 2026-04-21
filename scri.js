$(document).ready(function () {

  const apiKey = "626d8d260d921caff14e0afb1daded65";

  let currentCategory = "popular";

  const categoryTitles = {
    popular: "Popular Movies",
    top_rated: "Top Rated Movies",
    now_playing: "Now Playing Movies",
    upcoming: "Upcoming Movies"
  };
  let lastSearchQ =null;
  let lastScroll = 0;
  let currentPage = 1;
  let totalPages = 1;
  let loadMoreVisible = false;
  let lastPageLoaded = 1;

  function getFavorites() {
  return JSON.parse(localStorage.getItem("movieFavorites") || "[]");
    }

  function saveFavorites(favs) {
      localStorage.setItem("movieFavorites", JSON.stringify(favs));
    }

    function isFavorite(movieId) {
      return getFavorites().some(f => f.id === movieId);
    }

    function toggleFavorite(movie) {
      let favs = getFavorites();
      if (isFavorite(movie.id)) {
        favs = favs.filter(f => f.id !== movie.id);
      } else {
        favs.push({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          overview: movie.overview,
          vote_average: movie.vote_average,
          release_date: movie.release_date
        });
      }
      saveFavorites(favs);
    }



  function filterUpcomingMovies(movies) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); // tomorrow's date
  tomorrow.setHours(0, 0, 0, 0); // start of the day


  return movies.filter(m => {
    const release = new Date(m.release_date);
    return !isNaN(release) && release >= tomorrow;
  });
}







  //  Load Movies Function
  function loadMovies(endpoint, page = 1) {
    currentCategory = endpoint;
    loadMoreVisible = false;

    $("#homeView").html("<p>Loading...</p>");


    console.log("Loading movies:", endpoint);
    console.log("Current category:", currentCategory);


    $.ajax({
      url: `https://api.themoviedb.org/3/movie/${endpoint}`,
      method: "GET",
      data: {
        api_key: apiKey,
        region: "US"
      },
      success: function (data) {
            currentPage = data.page;
            totalPages = data.total_pages;

            let moviesToDisplay = data.results;

            if (endpoint === "upcoming") {
                moviesToDisplay = filterUpcomingMovies(data.results);
            }

            displayMovies(moviesToDisplay);

            if (page > 1) {
                for (let p = 2; p <= page; p++) {
                loadMoreMovies(p);
                }
            }

            checkAndShowLoadMore(moviesToDisplay)

      },
      error: function () {
        $("#homeView").html("<p>Error loading movies</p>");
      }

    });
  }


  function loadMoreMovies(pageToLoad) {
  const nextPage = pageToLoad || (currentPage + 1);
  if (currentPage >= totalPages) return;


  $.ajax({
    url: `https://api.themoviedb.org/3/movie/${currentCategory}`,
    method: "GET",
    data: {
      api_key: apiKey,
      page: nextPage,
      region: "US"
    },
    success: function (data) {
      currentPage = data.page;
      totalPages = data.total_pages;
      lastPageLoaded = data.page;
      loadMoreVisible = false;

      let moviesToAppend = data.results;

      if (currentCategory === "upcoming") {
        moviesToAppend = filterUpcomingMovies(data.results);
      }

      appendMovies(moviesToAppend);
      checkAndShowLoadMore(moviesToAppend);
    }
  });
}






function checkAndShowLoadMore(moviesOnPage) {
  if ($("#loadMoreBtn").length > 0) $("#loadMoreBtn").remove();
  loadMoreVisible = false;

  let hasMovies = moviesOnPage.length > 0;
  let hasMorePages = currentPage < totalPages;

  // Special handling for upcoming
  if (currentCategory === "upcoming") {
    hasMovies = moviesOnPage.some(m => {
      const release = new Date(m.release_date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0,0,0,0);

      hasMovies = moviesOnPage.some(m => {
      const release = new Date(m.release_date);
      return !isNaN(release) && release >= tomorrow;
    });
    });
  }

  if (hasMovies && hasMorePages) {
    $("#homeView").append('<button id="loadMoreBtn">Load More</button>');
    loadMoreVisible = true;
  }
}






function appendMovies(movies) {
  movies.forEach(function (movie) {
    let imageUrl = movie.poster_path
      ? "https://image.tmdb.org/t/p/w300" + movie.poster_path
      : "https://placehold.co/150?text=No+Image";

    let shortOverview = movie.overview.length > 100
      ? movie.overview.substring(0, 100) + "..."
      : movie.overview;
    //heart button
    const favClass = isFavorite(movie.id) ? "fav-btn active" : "fav-btn";
    const favIcon = isFavorite(movie.id) ? "&#9829;" : "&#9825;";


    $(".movie-grid").append(`
      <div class="movie-card" data-id="${movie.id}">
        <img src="${imageUrl}" alt="poster">
        <button class="${favClass}" data-id="${movie.id}" data-title="${movie.title}"
                    data-poster="${movie.poster_path || ''}" data-overview="${movie.overview.replace(/"/g, '&quot;')}"
                    data-rating="${movie.vote_average}" data-date="${movie.release_date}">${favIcon}</button>
        <h3>${movie.title}</h3>
        <p>${shortOverview}</p>
      </div>
    `);
  });

  $(".movie-card").off("click").on("click", function (e) {
    if ($(e.target).hasClass("fav-btn")) return;
    lastScroll = $(window).scrollTop();
    let movieId = $(this).data("id");
    loadMovieDetails(movieId);
  });
}






$(window).on("scroll", function () {
  if ($("#homeView").hasClass("detailed-view")) return;

  const scrollTop = $(window).scrollTop();
  const windowHeight = $(window).height();
  const docHeight = $(document).height();

  if (scrollTop + windowHeight >= docHeight - 100) {

    let canLoadMore = currentPage < totalPages;

    if (currentCategory === "upcoming") {
      // check if next page would have movies after filtering
      canLoadMore = canLoadMore && filteredUpcomingExists();
    }

    if (canLoadMore && !loadMoreVisible) {
      loadMoreVisible = true;

      if ($("#loadMoreBtn").length === 0) {
        $("#homeView").append(`<button id="loadMoreBtn">Load More</button>`);
      }
    }
  }
});

$(document).on("click", "#loadMoreBtn", function () {
  $(this).remove();
  loadMoreVisible = false;
  loadMoreMovies();
});





  //  Display Movies
  function displayMovies(movies) {
  $("#homeView").removeClass("detailed-view");
  console.log("Displaying movies:", movies);

  let title = categoryTitles[currentCategory] || "Movies";

  let html = `
    <h2 class="category-title">${title}</h2>
    <div class="movie-grid">
  `;


  movies.forEach(function (movie) {
    let imageUrl = movie.poster_path
      ? "https://image.tmdb.org/t/p/w300" + movie.poster_path
      : "https://placehold.co/150?text=No+Image";

    let shortOverview = movie.overview.length > 100
      ? movie.overview.substring(0, 100) + "..."
      : movie.overview;

    const favClass = isFavorite(movie.id) ? "fav-btn active" : "fav-btn";
    const favIcon  = isFavorite(movie.id) ? "&#9829;" : "&#9825;";

    html += `
      <div class="movie-card" data-id="${movie.id}">
        <img src="${imageUrl}" alt="poster">
        <h3>${movie.title}</h3>
        <p>${shortOverview}</p>
      </div>
    `;
  });

  html += `</div>`;

  $("#homeView").html(html);

  $(".movie-card").click(function () {
    let movieId = $(this).data("id");
    lastScroll = $(window).scrollTop();

    loadMovieDetails(movieId);
  });

}






  function loadMovieDetails(movieId) {
  $("#homeView").html("<p>Loading details...</p>");

  // Fetch movie details
  $.ajax({
    url: `https://api.themoviedb.org/3/movie/${movieId}`,
    method: "GET",
    data: {
      api_key: apiKey,
      append_to_response: "credits" // this loads cast
    },
    success: function (data) {
      displayMovieDetails(data);
    },
    error: function () {
      $("#homeView").html("<p>Error loading movie details</p>");
    }
  });
}







function displayMovieDetails(movie) {
  $("#homeView").addClass("detailed-view");

  let imageUrl = movie.poster_path
    ? "https://image.tmdb.org/t/p/w300" + movie.poster_path
    : "https://placehold.co/150?text=No+Image";

  // Build genres badges
  let genreHtml = "";
  if (movie.genres) {
    movie.genres.forEach(g => {
      genreHtml += `<span>${g.name}</span>`;
    });
  }

  let castCrewHtml = renderCastCrew(movie.credits);
  // heart state for detailed view
  const favClass = isFavorite(movie.id) ? "fav-btn-detail active" : "fav-btn-detail";
  const favIcon = isFavorite(movie.id) ? "&#9829; Favorited" : "&#9825; Add to Favoites";

  // Build cast list (first 5 actors)
  let castHtml = "";
  if (movie.credits && movie.credits.cast) {
    movie.credits.cast.slice(0, 5).forEach(actor => {
      castHtml += `<li>${actor.name} as ${actor.character}</li>`;
    });
  }

  $("#homeView").html(`
  <button id="backBtn">← Back</button>
  <div class="movie-detail-row">
    <img src="${imageUrl}" alt="poster">
    <div class="movie-info">
      <h2>${movie.title}</h2>
      <p><strong>Release Date:</strong> ${movie.release_date}</p>
      <div class="rating">⭐ ${movie.vote_average}</div>
      <div class="genres">${genreHtml}</div>
      <p>${movie.overview}</p>
       <button class="${favClass}"
                  data-id="${movie.id}" data-title="${movie.title}"
                  data-poster="${movie.poster_path || ''}" data-overview="${movie.overview.replace(/"/g, '&quot;')}"
                  data-rating="${movie.vote_average}" data-date="${movie.release_date}">${favIcon}</button>
    </div>
  </div>
  ${castCrewHtml} <!-- Places cast and crew outside row for full width -->
`);


}

 $(document).on("click", ".fav-btn-detail", function () {
    const btn = $(this);
    const movie = {
      id: parseInt(btn.data("id")),
      title: btn.data("title"),
      poster_path: btn.data("poster"),
      overview: btn.data("overview"),
      vote_average: btn.data("rating"),
      release_date: btn.data("date")
    };
    toggleFavorite(movie);
    const nowFav = isFavorite(movie.id);
    btn.html(nowFav ? "&#9829; Favorited" : "&#9825; Add to Favorites");
    btn.toggleClass("active", nowFav);
  });




function renderCastCrew(credits) {
  // Set how many initially visible
  const initialCount = 5;

  // Cast
  let html = "";
    html += `
    <div class="cast-section">
      <h3>Cast (${credits.cast.length})</h3>
      <div class="person-row cast-row">
    `;

    credits.cast.forEach((actor, index) => {
    const imgUrl = actor.profile_path
      ? "https://image.tmdb.org/t/p/w185" + actor.profile_path
      : "https://placehold.co/150?text=No+Image";
    const hiddenClass = index >= initialCount ? 'hidden-person' : '';
    html += `
      <div class="person-card ${hiddenClass}">
        <img src="${imgUrl}" alt="${actor.name}">
        <p>${actor.name}</p>
        ${actor.character ? `<p style="font-size:0.7rem;color:#ccc;">plays ${actor.character}</p>` : ""}
      </div>
    `;
  });
  html += `
      </div>
      ${credits.cast.length > initialCount ? '<button class="view-more-btn" data-target="cast">View More</button>' : ""}
    </div>
  `;


  // Crew
    html += `
    <div class="crew-section">
      <h3>Crew (${credits.crew.length})</h3>
      <div class="person-row crew-row">
    `;
    credits.crew.forEach((member, index) => {
    const imgUrl = member.profile_path
      ? "https://image.tmdb.org/t/p/w185" + member.profile_path
      : "https://placehold.co/150?text=No+Image";
    const hiddenClass = index >= initialCount ? 'hidden-person' : '';
    html += `
      <div class="person-card ${hiddenClass}">
        <img src="${imgUrl}" alt="${member.name}">
        <p>${member.name}</p>
        <p style="font-size:0.7rem;color:#ccc;">${member.job}</p>
      </div>
    `;
  });
  html += `
      </div>
      ${credits.crew.length > initialCount ? '<button class="view-more-btn" data-target="crew">View More</button>' : ""}
    </div>
  `;

  return html;
}





// Handle view more clicks
$(document).on('click', '.view-more-btn', function() {
  const btn = $(this);
  const rowDiv = btn.prev('.person-row'); // only toggle the previous row
  rowDiv.find('.hidden-person').slideToggle(); // toggle hidden cards
  // Swap button text correctly
  if (btn.text() === "View More") {
    btn.text("View Less");
  } else {
    btn.text("View More");
  }
});





  //  Dropdown

  function handleCategoryChange(category) {
  if (!category) return;
  lastSearchQ = null;
  currentCategory = category;
  loadMovies(category);
}

//  Select dropdown
$("#categorySelect").change(function () {
  const selected = $(this).val();
  handleCategoryChange(selected);
});

//  Dropdown links
$(document).on("click", ".dropdown-content a", function (e) {
  e.preventDefault();
  const category = $(this).data("category");
  handleCategoryChange(category);
});


const dropdown = document.querySelector(".dropdown");
const menu = dropdown.querySelector(".dropdown-content");
let hideTimeout;

dropdown.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);          // cancel any hide delay
  menu.style.visibility = "visible";
  menu.style.opacity = "1";
  menu.style.pointerEvents = "auto";  // enable clicks
});

dropdown.addEventListener("mouseleave", () => {
  // Add a small delay to prevent flicker when moving fast
  hideTimeout = setTimeout(() => {
    menu.style.opacity = "0";
    menu.style.pointerEvents = "none";
    setTimeout(() => {
      menu.style.visibility = "hidden";
    }, 200); // matches transition
  }, 150); // delay before hiding
});





$(document).on('click', '#backBtn', function() {
  $("#homeView").removeClass("detailed-view");
  if (lastSearchQ) {
      searchMovies(lastSearchQ);
    } else {
      let cat = currentCategory || "popular";
      loadMovies(cat, lastPageLoaded);

  setTimeout(() => {
    $(window).scrollTop(lastScroll);
  }, 500);
}});


 function searchMovies(query) {
    if (!query.trim()) return;
    lastSearchQ = query;

    // Show homeView, hide others
    $("#favView").hide();
    $("#homeView").show();
    $("#homeView").removeClass("detailed-view");
    $("#homeView").html("<p>Searching...</p>");

    $.ajax({
      url: "https://api.themoviedb.org/3/search/movie",
      method: "GET",
      data: { api_key: apiKey, query: query, region: "US" },
      success: function (data) {
        if (data.results.length === 0) {
          $("#homeView").html(`<p style="text-align:center;color:#aaa;">No results found for "<strong>${query}</strong>"</p>`);
          return;
        }
        // Reuse displayMovies, but set a custom title
        currentCategory = null; // not a category browse
        let fakeCategory = `Search results for "${query}"`;

        let html = `<h2 class="category-title">${fakeCategory}</h2><div class="movie-grid">`;
        data.results.forEach(function (movie) {
          let imageUrl = movie.poster_path
            ? "https://image.tmdb.org/t/p/w300" + movie.poster_path
            : "https://placehold.co/150?text=No+Image";
          let shortOverview = (movie.overview || "").length > 100
            ? movie.overview.substring(0, 100) + "..."
            : (movie.overview || "No description.");
          const favClass = isFavorite(movie.id) ? "fav-btn active" : "fav-btn";
          const favIcon  = isFavorite(movie.id) ? "&#9829;" : "&#9825;";
          html += `
            <div class="movie-card" data-id="${movie.id}">
              <img src="${imageUrl}" alt="poster">
              <button class="${favClass}" data-id="${movie.id}" data-title="${movie.title}"
                data-poster="${movie.poster_path || ''}" data-overview="${(movie.overview || "").replace(/"/g, '&quot;')}"
                data-rating="${movie.vote_average}" data-date="${movie.release_date}">${favIcon}</button>
              <h3>${movie.title}</h3>
              <p>${shortOverview}</p>
            </div>`;
        });
        html += "</div>";
        $("#homeView").html(html);

        $(".movie-card").click(function (e) {
          if ($(e.target).hasClass("fav-btn")) return;
          lastScroll = $(window).scrollTop();
          loadMovieDetails($(this).data("id"));
        });
      },
      error: function () {
        $("#homeView").html("<p>Error searching movies.</p>");
      }
    });
  }

  // Trigger search on button click
  $("#searchSubmit").click(function () {
    searchMovies($("#searchInput").val());
  });

  // Trigger search on Enter key
  $("#searchInput").on("keypress", function (e) {
    if (e.which === 13) searchMovies($(this).val());
  });

  function displayFavorites() {
    const favs = getFavorites();
    $("#homeView").hide();
    $("#favView").show();

    const grid = $("#favResults").empty();

    if (favs.length === 0) {
      $("#favEmpty").show();
      return;
    }
    $("#favEmpty").hide();

    favs.forEach(function (movie) {
      let imageUrl = movie.poster_path
        ? "https://image.tmdb.org/t/p/w300" + movie.poster_path
        : "https://placehold.co/150?text=No+Image";
      let shortOverview = (movie.overview || "").length > 100
        ? movie.overview.substring(0, 100) + "..."
        : (movie.overview || "");

      grid.append(`
        <div class="movie-card fav-card" data-id="${movie.id}">
          <img src="${imageUrl}" alt="poster">
          <button class="fav-btn active" data-id="${movie.id}" data-title="${movie.title}"
            data-poster="${movie.poster_path || ''}" data-overview="${(movie.overview || "").replace(/"/g, '&quot;')}"
            data-rating="${movie.vote_average}" data-date="${movie.release_date}">&#9829;</button>
          <h3>${movie.title}</h3>
          <p>${shortOverview}</p>
          <button class="remove-fav-btn" data-id="${movie.id}">Remove</button>
        </div>
      `);
    });

    // Click card → detail view
    $(".fav-card").click(function (e) {
      if ($(e.target).hasClass("fav-btn") || $(e.target).hasClass("remove-fav-btn")) return;
      lastScroll = $(window).scrollTop();
      $("#favView").hide();
      $("#homeView").show();
      loadMovieDetails($(this).data("id"));
    });
  }

  // Remove from favorites inside fav view
  $(document).on("click", ".remove-fav-btn", function (e) {
    e.stopPropagation();
    const movieId = parseInt($(this).data("id"));
    let favs = getFavorites().filter(f => f.id !== movieId);
    saveFavorites(favs);
    displayFavorites(); // re-render
  });

  $("#favBtn").click(function () {
    displayFavorites();
  });
  // ============================================================


  // Home button
  $("#homeBtn").click(function () {
    $("#favView").hide();
    $("#homeView").show();
    $("#homeView").removeClass("detailed-view");
    let cat = currentCategory || "popular";
    loadMovies(cat);
  });

  loadMovies(currentCategory);
});
