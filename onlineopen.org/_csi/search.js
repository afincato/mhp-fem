$(function() {
	var lastSearchTokens = [];
	var lastSearchTokens = "";

	function searchErrorHandler(data) {
		if (typeof console !== "undefined" && "log" in console) {
			console.log(data);
		}
	}
	function uniqueResults(results) {
		var articleIds = {};
		var filteredResults = [];
		for (var i = 0; i < results.length; ++i) {
			if (!(results[i].id in articleIds)) {
				articleIds[results[i].id] = true;
				filteredResults.push(results[i]);
			}
		}
		return filteredResults;
	}
	function sanitizeFromHtml(html) {
		if (typeof(html) == 'string') {
			// strip the images before we ise jQuery trick - overzealous browser
			// might already start downloading the images unnecessarily
			html = html.replace(/\<img[^\>]*\>/ig, '');
		}
		return $( '<div>' + html + '</div>' ).text();
	}
	function sanitizeQuery(query) {
		// sanitization: keep in sync with the same operations in search.php
		query = query.replace(/\s+/g, ' ').trim();
		var tokens = query.split(' ');
		if (tokens.length > 3) {
			query = tokens.slice(0, 3).join(' ');
		}
		return query;
	}
	function appendHighlightRange(ranges, newStart, newLength) {
		var newEnd = newStart + newLength;
		for (var i = 0; i < ranges.length; i++) {
			if (ranges[i][0] <= newEnd && ranges[i][1] >= newStart) {
				// we have overlap, we should merge. recalculate start and end
				ranges[i][0] = Math.min(ranges[i][0], newStart);
				ranges[i][1] = Math.max(ranges[i][1], newEnd);

				// now ranges[i] might be overlapping with ranges[i+1]
				while (i + 1 < ranges.length && ranges[i][1] >= ranges[i+1][0]) {
					ranges[i][1] = Math.max(ranges[i][1], ranges[i+1][1]);
					ranges.splice(i+1, 1);
				}
				return;
			}
		}

		// new range needs to be added, in the right place
		// we do it simply by appending and the re-sorting
		ranges.push([newStart, newEnd]);
		ranges.sort(function (e1, e2) {
			return e1[0] - e2[0];
		});
	}
	function highlightTerms(terms, text) {
		text = sanitizeFromHtml(text);
		lowerText = text.toLowerCase();

		// collect all ranges for highlighting
		// each entry is an 2-element array, meaning [beginIdx, endIdx]
		var ranges = [];
		for (var i = 0; i < terms.length; ++i) {
			var term = terms[i];

			var idx = 0;
			while ((idx = lowerText.indexOf(term.toLowerCase(), idx)) >= 0) {
				appendHighlightRange(ranges, idx, term.length);
				idx += term.length;
			}
		}

		if (ranges.length === 0) {
			//should never happen just sanity
			return text;
		}

		// iterate over the ranges and inject the highlight span
		// we iterate backwards as injecting the span invalidates all the indices
		// after it
		for (var i = ranges.length - 1; i >=0; --i) {
			var startIdx = ranges[i][0];
			var endIdx = ranges[i][1];
			var before = text.substring(0, startIdx);
			var highlightedTerm = '<span class=highlight>' + text.substring(startIdx, endIdx) + '</span>';
			var after = text.substring(endIdx);
			text = before + highlightedTerm + after;
		}
		return text;
	}
	function highlightTermsInAbstract(terms, abstract) {
		var sentences = abstract.split( '.' );
		var bestSentence = -1;
		var bestSentenceTermMatch = -1;
		for (var i = 0; i < sentences.length && bestSentenceTermMatch !== terms.length; ++i) {
			var matchedTermsCount = 0;
			var thisSentence = sentences[i].toLowerCase();
			for (var it = 0; it < terms.length; ++it) {
				if (thisSentence.indexOf(terms[it].toLowerCase()) >= 0) {
					++matchedTermsCount;
				}
			}
			if (matchedTermsCount > bestSentenceTermMatch) {
				bestSentenceTermMatch = matchedTermsCount;
				bestSentence = i;
			}
		}
		if (bestSentence >= 0) {
			return '<div class=searchAbstractWrapper>' + highlightTerms(terms, sentences[bestSentence]) + '</div>';
		}
		return abstract;
	}
	function formatTags(tags) {
		return tags.split('|').join(' ');
	}
	function renderSearchItem(ul, item) {
		var li = $( "<li class=searchResult>" ).appendTo( ul );
		if (item.noResults) {
			// no matches found, this is an artificial item
			return li.append( item.label );
		}

		var source = item.source;
		var title = item.title;
		var contributor = item.full_name;
		if (source == "title") {
			title = highlightTerms(lastSearchTokens, title);
		}
		else if (source == "contributor") {
			contributor = highlightTerms(lastSearchTokens, contributor);
		}

		li.append( "<div class=searchTitle>" + title + "</div>" );
		li.append( "<div class=searchContributor>" + contributor + "</div>" );
		if (source == "tag") {
			li.append( "<div class=searchTags>" + highlightTerms(lastSearchTokens, formatTags(item.tags)) + "</div>" );
		}
		else if (source == "theme") {
			li.append( "<div class=searchTheme>" + highlightTerms(lastSearchTokens, item.theme) + "</div>" );
		}
		var abstract = ( item.abstract !== null && item.abstract.length > 0 ? item.abstract : '' );
		abstract = sanitizeFromHtml(abstract);
		if (source == "abstract" || source == "chapter") {
			abstract = highlightTermsInAbstract(lastSearchTokens, abstract);
		}
		var abstractEl = $("<div class=searchAbstract>" + abstract + "</div>");
		li.append( abstractEl );

		return li;
	}
	function fixAbstractHighlights() {
		$('.searchAbstractWrapper').each(function() {
			var wrapperEl = $(this);
			var abstractEl = wrapperEl.parent();
			var abstractHighlights = abstractEl.find('.highlight');
			if (abstractHighlights.length > 0) {
				var highlight = $(abstractHighlights[0]);
				var acceptableOffset = abstractEl.height() - 5;
				var abstractElOffsetTop = abstractEl.offset().top;
				var thisOffset = highlight.offset().top - abstractElOffsetTop;
				var shiftUp = 0;
				while (thisOffset > acceptableOffset && shiftUp < 1000) {
					++shiftUp;
					wrapperEl.css('top', '-' + (shiftUp * 1.25) + 'em');
					thisOffset = highlight.offset().top - abstractElOffsetTop;
				}
			}
		});
	}

	var searchInput = $( '#search input' );
	var searchContext = searchInput.attr('context');
	var searchAutoComplete =
		searchInput
		.autocomplete({
			appendTo: '#search',
			source: function (request, response) {
				var searchTerm = sanitizeQuery(request.term);
				$.ajax({
					url: 'search.php',
					data: {
						q: searchTerm,
						context: searchContext
					},
					success: function (data) {
						try {
							lastSearchTerm = searchTerm;
							lastSearchTokens = lastSearchTerm.split(' ');
							var results = JSON.parse(data);
							results = uniqueResults(results);
							if (results.length === 0) {
								results = [ {label: "No items found matching '" + lastSearchTerm + "'", noResults:true} ];
							}
							response(results);
							fixAbstractHighlights();
						} catch (e) {
							searchErrorHandler('"' + e + '" when parsing: ' + data);
						}
						var offset = searchInput.offset().top + searchInput.outerHeight();
						$('.ui-autocomplete').css('max-height', getWindowHeight() - offset - 9);
					},
					error: searchErrorHandler
				});
			},
			focus: function (event, ui) {
				if (ui.item.noResults) {
					searchInput.val( lastSearchTerm );
				} else {
					searchInput.val( ui.item.title );
				}
				return false;
			},
			select: function (event, ui) {
				if (ui.item.noResults) {
					return false;
				}
				// kill the filters, otherwise arriving at the article with some filters preselected might feel off
				// and, searching for something can be taken as an intent to have a new perspective on the data
				docCookies.removeItem( 'open_filters' );
				window.document.location = ui.item.url_title;
			}
		}).autocomplete( "instance" );

	searchAutoComplete._renderItem = renderSearchItem;

	// prevent the autocomplete box stretching way outside the window
	// http://stackoverflow.com/questions/5643767/jquery-ui-autocomplete-width-not-set-correctly
	searchAutoComplete._resizeMenu = function () {
		var ul = this.menu.element;
		ul.outerWidth(this.element.outerWidth());
	};
});
