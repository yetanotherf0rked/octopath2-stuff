---
---
// ----------------------
// Tab switching functionality
// ----------------------
document.querySelectorAll('.tab-button').forEach(function(button) {
  button.addEventListener('click', function() {
    var tab = this.getAttribute('data-tab');
    document.querySelectorAll('.tab-content').forEach(function(content) {
      if (content.id === 'tab-' + tab) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    document.querySelectorAll('.tab-button').forEach(function(btn) {
      btn.classList.remove('active');
    });
    this.classList.add('active');
  });
});

// ----------------------
// Global Variables for Routes Tables
// ----------------------
var routesData = {{ site.data.routes-with-timestamps | jsonify }};
var tableData = {};       // To store the original routes array for each table
var tableSortState = {};  // To store current sort state (column and order) for each table
var tableCounter = 0;     // For generating unique table IDs

// ----------------------
// Utility Functions
// ----------------------
function getPriority(route) {
  var hasFastest = !!route.fastest;
  var hasBeginner = !!route.beginner_friendly;
  var hasOther = !!(route.heavy_rng || route.cait_dependent || route.octopuff_dependent);
  if (hasFastest && hasBeginner) return 1;
  else if (hasFastest || hasBeginner || hasOther) return 2;
  else return 3;
}

function defaultSort(routes) {
  return routes.slice().sort(function(a, b) {
    var pa = getPriority(a);
    var pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    if (pa === 3) { // both have no flags, sort by updated date descending (most recent first)
      var da = new Date(a.updated || 0);
      var db = new Date(b.updated || 0);
      return db - da;
    }
    return 0;
  });
}

function sortRoutes(routes, column, order) {
  var sorted = routes.slice();
  if (column === "flags") {
    sorted.sort(function(a, b) {
      var pa = getPriority(a);
      var pb = getPriority(b);
      if (pa === pb && pa === 3) {
        var da = new Date(a.updated || 0);
        var db = new Date(b.updated || 0);
        return order === 'asc' ? (da - db) : (db - da);
      } else {
        return order === 'asc' ? (pa - pb) : (pb - pa);
      }
    });
  } else if (column === "route") {
    sorted.sort(function(a, b) {
      var at = a.Title.toLowerCase();
      var bt = b.Title.toLowerCase();
      if (at < bt) return order === 'asc' ? -1 : 1;
      if (at > bt) return order === 'asc' ? 1 : -1;
      return 0;
    });
  } else if (column === "author") {
    sorted.sort(function(a, b) {
      var aa = a.author.toLowerCase();
      var ba = b.author.toLowerCase();
      if (aa < ba) return order === 'asc' ? -1 : 1;
      if (aa > ba) return order === 'asc' ? 1 : -1;
      return 0;
    });
  } else if (column === "created") {
    sorted.sort(function(a, b) {
      var da = new Date(a.created || 0);
      var db = new Date(b.created || 0);
      return order === 'asc' ? (da - db) : (db - da);
    });
  } else if (column === "updated") {
    sorted.sort(function(a, b) {
      var da = new Date(a.updated || 0);
      var db = new Date(b.updated || 0);
      return order === 'asc' ? (da - db) : (db - da);
    });
  }
  return sorted;
}

function renderTableBody(routes) {
  var html = '';
  routes.forEach(function(route) {
    html += '<tr>';
    // Build Flags column with emojis and tooltips.
    var flagsHtml = "";
    if (route.beginner_friendly) flagsHtml += '<span title="Beginner Friendly">🌱</span> ';
    if (route.fastest)         flagsHtml += '<span title="Fastest">⚡</span> ';
    if (route.heavy_rng)       flagsHtml += '<span title="Heavy RNG">🎲</span> ';
    if (route.cait_dependent)  flagsHtml += '<span title="Cait Dependent">🐱</span> ';
    if (route.octopuff_dependent) flagsHtml += '<span title="Octopuff Dependent">🐙</span> ';
    html += '<td style="text-align: center;">' + flagsHtml + '</td>';
    // Title cell: route title wrapped in an anchor tag.
    html += '<td><a href="' + route.link + '" target="_blank">' + route.Title + '</a></td>';
    // Author
    html += '<td>' + route.author + '</td>';
    // Created and Updated dates
    html += '<td>' + (route.created || 'N/A') + '</td>';
    html += '<td>' + (route.updated || 'N/A') + '</td>';
    html += '</tr>';
  });
  return html;
}

function attachSorting(tableId) {
  var table = document.getElementById(tableId);
  var tbody = table.querySelector("tbody");
  var headers = table.querySelectorAll("thead th");
  // Initialize sort state for this table: no column sorted initially
  tableSortState[tableId] = { column: null, order: 'neutral' };

  headers.forEach(function(th) {
    var column = th.getAttribute('data-column');
    if (!column) return;
    th.style.cursor = 'pointer';
    th.addEventListener('click', function() {
      // Determine new sort order for this column
      var currentState = tableSortState[tableId];
      var newOrder = 'asc';
      if (currentState.column === column) {
        // Toggle order if already sorted by this column
        newOrder = currentState.order === 'asc' ? 'desc' : 'asc';
      }
      // Update sort state for this table
      tableSortState[tableId] = { column: column, order: newOrder };

      // Reset all header symbols to neutral
      headers.forEach(function(header) {
        if (header.getAttribute('data-column')) {
          header.querySelector('.sort-symbol').innerHTML = '⇅';
        }
      });
      // Set symbol for the sorted column
      th.querySelector('.sort-symbol').innerHTML = newOrder === 'asc' ? '↑' : '↓';

      // Get original data for this table and sort it manually
      var originalData = tableData[tableId];
      var sortedData = sortRoutes(originalData, column, newOrder);
      tbody.innerHTML = renderTableBody(sortedData);
    });
  });
}

// ----------------------
// Rendering Routes
// ----------------------
function renderGroup(groupName, group, level) {
  level = level || 2;
  var html = '';
  html += '<div class="group">';
  html += '<h' + level + ' class="toggle" onclick="toggleSection(this)">';
  html += '<span class="toggle-icon">&#9660;</span>' + groupName;
  html += '</h' + level + '>';

  html += '<div class="group-content">';
  if (Array.isArray(group)) {
    if (group.length === 0) {
      html += '<em>No route for this category yet! Maybe you\'ll be the first one to route it?</em>';
    } else if (group[0].Title) {
      var defaultSortedGroup = defaultSort(group);
      tableCounter++;
      var tableId = 'routes-table-' + tableCounter;
      // Store the original (unsorted) data for later manual sorting
      tableData[tableId] = group.slice();
      html += '<table id="' + tableId + '" class="routes-table">';
      html += '<colgroup>';
      html += '<col style="width: 10%;">'; // Flags column
      html += '<col style="width: 30%;">'; // Title column
      html += '<col style="width: 20%;">'; // Author column
      html += '<col style="width: 20%;">'; // Created column
      html += '<col style="width: 20%;">'; // Updated column
      html += '</colgroup>';
      html += '<thead><tr>';
      html += '<th data-column="flags">Flags <span class="sort-symbol">⇅</span></th>';
      html += '<th data-column="route">Route <span class="sort-symbol">⇅</span></th>';
      html += '<th data-column="author">Author <span class="sort-symbol">⇅</span></th>';
      html += '<th data-column="created">Created <span class="sort-symbol">⇅</span></th>';
      html += '<th data-column="updated">Updated <span class="sort-symbol">⇅</span></th>';
      html += '</tr></thead>';
      html += '<tbody>';
      html += renderTableBody(defaultSortedGroup);
      html += '</tbody></table>';
    }
  } else if (group && typeof group === 'object') {
    // Do not sort keys alphabetically; use natural order from the JSON
    var keys = Object.keys(group);
    keys.forEach(function(key) {
      html += renderGroup(key, group[key], level + 1);
    });
  }
  html += '</div></div>';
  return html;
}

var routeContainer = document.getElementById('routeContainer');
// Preserve category order from JSON (do not sort keys)
var topKeys = Object.keys(routesData);
var routesHtml = '';
topKeys.forEach(function(key) {
  routesHtml += renderGroup(key, routesData[key], 2);
});
routeContainer.innerHTML = routesHtml;

// After inserting the routes HTML, attach manual sorting to each table
for (var id in tableData) {
  attachSorting(id);
}

// ----------------------
// Toggle Group Sections
// ----------------------
function toggleSection(headerEl) {
  var content = headerEl.nextElementSibling;
  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    headerEl.querySelector(".toggle-icon").innerHTML = "&#9660;";
  } else {
    content.classList.add("hidden");
    headerEl.querySelector(".toggle-icon").innerHTML = "&#9658;";
  }
}

// ----------------------
// Rendering Resources Tab
// ----------------------
var resourcesData = {{ site.data.resources | jsonify }};
var resourceContainer = document.getElementById('resourceContainer');
var resourcesHtml = '';
Object.keys(resourcesData).forEach(function(category) {
  resourcesHtml += '<h2>' + category + '</h2>';
  resourcesHtml += '<ul>';
  resourcesData[category].forEach(function(item) {
    resourcesHtml += '<li><a href="' + item.link + '" target="_blank">' + item.Title + '</a></li>';
  });
  resourcesHtml += '</ul>';
});
resourceContainer.innerHTML = resourcesHtml;
