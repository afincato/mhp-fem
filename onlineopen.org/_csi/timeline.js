$( function( ) {

var debugTimeline = false;	//switches debug logging of timeline on/off

var headlinemaxlength = 100;

var allPossibleFilterTypes = {};

var isTouchDevice = 'ontouchstart' in window; // determine if it's touch device

if (isTouchDevice) {
	$('html').removeClass('dohover');
}

var lastMouseClientY = 0;
var lastScrollY = 0;
var timelineLocationCookieName = 'timeline_location_onclick';

function openTimelineItem( ) {
	docCookies.setItem(timelineLocationCookieName, lastMouseClientY + ':' + lastScrollY, 60 * 5);
	window.document.location = $( this ).data( 'location' );
}

function selectSegment( ) {
	var clusterId = $(this).data('clusterId');
	var cluster = $( '#' +  clusterId);

	var mainmenu = $( '#mainmenu' );
	var scrolltop = cluster.offset().top - mainmenu.outerHeight() + 13;

	var scrollspeed = 1000;

	$( 'body, html' )
		.stop( true )
		.animate( { scrollTop: scrolltop }, scrollspeed );
}

function updateTimelineHighlight( ) {
	var matchingindex = 0;
	var clusters = $( '#text div[id^=cluster]' );

	if ( $( window ).scrollTop( ) + getWindowHeight( ) >= $( document ).height( ) )
	{
		// We scrolled to the bottom of the page.
		// Choose the last cluser, excluding cluster
		matchingindex = clusters.length - 1 - 1;
	}
	else
	{
		var menuheight = $( '#mainmenu' ).outerHeight( ) + 4;
		var scrolltop = $( window ).scrollTop( ) + menuheight;

		clusters.each( function( index, item ) {
			if (index === 0) {
				// exclude cluster-0
				return true;
			}
			if ( scrolltop >= parseInt( $(this).offset( ).top ) ) {
				matchingindex = index - 1;
			}
		} );
	}

	// highlight the segment
	$( '#timeline .subitem.current' )
		.removeClass( 'current' );
	$( '#timeline #subitem-' + matchingindex )
		.addClass( 'current' );
}



var allArticles = null;
var filteredArticles = null;
var isCurrentArticleInCurrentFilter = true;


function articleSorter( a1, a2 ) {
	if (a1['datePublished'] === a2['datePublished']) {
		if (a1['sequence'] === a2['sequence'] ||
				a1['sequence'] === null ||
				a2['sequence'] === null) {
			// biggest id first
			return a2['id'] - a1['id'];	//last resort
		}
		// ASC on sequence within one publish date (i.e. issue)
		return a1['sequence'] - a2['sequence'];
	}
	// DESC on the datePublished, to present newest on top
	// dates are formated YYYY-MM-DD, which means we can compare them as strings
	return a1['datePublished'] < a2['datePublished'] ? 1 : -1;
}
// when filtered on theme, editorials should be on top
function articleSorterForThemeFilter( a1, a2 ) {
	if (a1['type'] === 'editorial' && a2['type'] === 'editorial') {
		return articleSorter( a1, a2 );
	}

	if (a1['type'] === 'editorial') {
		return -1;
	}
	return 1;
}

// when filtering on issue number
function articleSorterForIssueNumber( a1, a2 ) {
	if (a1['sequence'] === null || a2['sequence'] === null) {
		// fallback, filter should have picked up on articles with sequence
		return a2['id'] - a1['id'];
	}
	// ASC on sequence
	return a1['sequence'] - a2['sequence'];
}

function parseArticles( ds ) {


	allArticles = [ ];
	ds.each( function ( row ) {
		var thisArticle = {
			id: row[ 'id' ],
			url_title: row [ 'url_title' ],
			sequence: row[ 'sequence' ],
			datePublished: row[ 'datePublished' ],
			year: (row[ 'yearPublished' ] || 'none').toString(),
			title: row[ 'title' ],
			theme: row[ 'theme' ],
			type: row[ 'type' ],
			tag: ( row[ 'tags' ] == null ? [] :
				   row[ 'tags' ].split( '|' ) ),
			mainContributor: row[ 'main_contributor' ]
		};

		allArticles.push( thisArticle );
	});

	allArticles.sort( articleSorter );
}



// Sizing Master controls sizing of items on timeline, and responds to mouse movements and window resizes
var SizingMaster = (function() {
	// allHeights holds heights of each item depending on which item is currently hovered over
	// that is: allHeights[k] has an array of heights for all items for when k-th item is hovered over
	var allHeights = null;

	// yBorders is an array. yBorders[k] is the location (in pixels) of the top border of the k-th item,
	// when k-th item is hovered over. It's basically the sum of all heights from allWeights[k] from 0 to (k-1)
	// so it's information is redundant, but it makes determining which item is currently hovered over easier
	var yBorders = null;

	// all elements that are subject to resizing (set by newResizeables)
	var elements = null;

	var selectedArticleIdx = -1;

	var wrapperElement = null;	// #timeline
	var scrollWrapperElement = null; // #timeline .scrollWrapper
	var focusElement = null; // #timeline #focusElement
	var timespanElement = null;

	var scroller = null;

	/** @const*/var defaultMinClusterHeight = 30;
	/** @const*/var stdArticleHeight = 12;
	/** @const*/var highlightedArticleHeight = 56;
	/** @const*/var sizeFadeOutDistance = 5;
	/** @const*/var MIN_FOCUS_ELEMENT_HEIGHT = 50;

	var totalHeight = 0;
	var detailedArticleHeight = highlightedArticleHeight; // may be adjusted

	// whether a dragging of focus element is in progress. needed to prevent double feedback
	// (dragging updates position of focus element and triggers scrolling, which should not trigger update of focus element)
	var isDragging = false;
	// whether a dragging has just happened. Needed to ignore 'click' that is generated after end of dragging.
	var wasDragging = false;

	function sumUpBefore(a, idx) {
		if (idx < 0) {
			return 0;
		}
		var sum = 0;
		idx = Math.min(idx, a.length);
		for (var i=0; i<idx; i++) {
			sum += a[i];
		}
		return sum;
	}
	function determineFadeOutBorders(refIdx1, totalIdx) {
		var fadeOutLeftBorder = refIdx1 - sizeFadeOutDistance;
		var fadeOutRightBorder = refIdx1 + sizeFadeOutDistance;
		if (fadeOutLeftBorder < 0) {
			fadeOutRightBorder += -fadeOutLeftBorder;
			fadeOutLeftBorder = 0;
		}
		if (fadeOutRightBorder >= totalIdx) {
			fadeOutLeftBorder -= fadeOutRightBorder - totalIdx;
			fadeOutLeftBorder = Math.max(fadeOutLeftBorder, 0);
			fadeOutRightBorder = totalIdx - 1;
		}
		return [fadeOutLeftBorder, fadeOutRightBorder];
	}
	function determineTotalHeight() {
		var ret = 0;
		var totalIdx = elements.length;
		for (var refIdx1 = 0; refIdx1 < totalIdx; ++refIdx1) {
			var fadeOutBorders = determineFadeOutBorders(refIdx1, totalIdx);
			var fadeOutLeftBorder = fadeOutBorders[0];
			var fadeOutRightBorder = fadeOutBorders[1];
			var thisHeight = 0;
			// keep the logic in sycn with calculateHeights()
			for (var i = 0; i < totalIdx; ++i) {
				if (i === selectedArticleIdx) {
					thisHeight += detailedArticleHeight;
				} else if (i === refIdx1 || i === refIdx1-1) {
					thisHeight += highlightedArticleHeight;
				} else if (i < fadeOutLeftBorder || i > fadeOutRightBorder) {
					thisHeight += stdArticleHeight;
				} else {
					thisHeight += stdArticleHeight + (highlightedArticleHeight - stdArticleHeight)/2;
				}
			}
			ret = Math.max(ret, thisHeight);
		}
		return ret;
	}
	// calculate weights for totalIdx number of items,
	// where refIdx1 and refIdx2 are items with special size
	// refIdx1 corresponds to the item under mouse
	// refIdx2 corresponds to the 'selected' item on the timeline
	//  (e.g. currently displayed article, which has the breakdown into chapters)
	// note that refIdx1 and refIdx2 can be the same index
	//  (when mouse is over the 'selected' item on the timeline)
	// returns an array of item heights, which should sum up to totalHeight
	// one extra gotcha is that item (refIdx1-1) also has to be treated as special
	//  (under mouse), to support weighted average calculation when transiting
	//  with mouse between two items
	function calculateHeights(totalIdx, refIdx1, refIdx2) {
		var ret = [];
		var thisHeightForRegularItemsScaling = totalHeight;
		var fadeOutBorders = determineFadeOutBorders(refIdx1, totalIdx);
		var fadeOutLeftBorder = fadeOutBorders[0];
		var fadeOutRightBorder = fadeOutBorders[1];
		var normalizer = 0;
		// keep the logic in sycn with determineTotalHeight()
		for (var i = 0; i < totalIdx; ++i) {
			if (i == refIdx2) {
				ret.push(detailedArticleHeight);
				thisHeightForRegularItemsScaling -= detailedArticleHeight;
			} else if (i === refIdx1 || i === refIdx1-1) {
				ret.push(highlightedArticleHeight);
				thisHeightForRegularItemsScaling -= highlightedArticleHeight;
			} else if (i < fadeOutLeftBorder || i > fadeOutRightBorder) {
				ret.push(0);
				thisHeightForRegularItemsScaling -= stdArticleHeight;
			} else {
				var weight = Math.abs(refIdx1 - i) - 1; // [0,)
				if (i < refIdx1) {
					weight /= refIdx1 - fadeOutLeftBorder;
				} else {
					weight /= fadeOutRightBorder - refIdx1;
				}
				weight = 1 - weight;	// [0,1]
				ret.push(weight);
				normalizer += weight;
				thisHeightForRegularItemsScaling -= stdArticleHeight;
			}
		}
		if (normalizer > 0) {
			normalizer = thisHeightForRegularItemsScaling / normalizer;
		}
		if (debugTimeline) {
			console.log("normalizer=" + normalizer + " ret=" + ret);
		}
		for (var i = 0; i < totalIdx; ++i) {
			if (i !== refIdx2 && i != refIdx1 && i !== refIdx1-1) {
				ret[i] = stdArticleHeight + ret[i] * normalizer;
			}
		}
		if (debugTimeline) {
			console.log(
				"totalIdx=" + totalIdx +
				" refIdx1=" + refIdx1 +
				" refIdx2=" + refIdx2 +
				" fadeOutBorders=" + fadeOutLeftBorder + "," + fadeOutRightBorder +
				" thisHeightForRegularItemsScaling=" + thisHeightForRegularItemsScaling +
				" totalHeight=" + totalHeight +
				" controlSum=" + sumUpBefore(ret, ret.length) +
				" heights=" + ret
			);
		}
		return ret;
	}
	function calculateAllHeights(columns, selectedArticle) {
		var cols = [];
		for (var c=0;c<columns;++c) {
			cols.push(calculateHeights(columns, c, selectedArticle));
		}
		return cols;
	}
	function calculateBordersOfDominatingItems(d) {
		var ret = [];
		for (var idx=0; idx<d.length; ++idx) {
			var weights = d[idx];
			var accu = sumUpBefore(weights, idx);
			ret.push(accu);
		}
		return ret;
	}
	function arrayAverage(a1, a2, w1) {
		var ret = [];
		for (var i=0; i<a1.length; ++i) {
			ret.push(a1[i] * w1 + a2[i] * (1-w1));
		}
		return ret;
	}
	function map(value, inMin, inMax, outMin, outMax) {
		//not yet inMax === 0 safe
		return outMin + (value - inMin) / (inMax - inMin) * (outMax - outMin);
	}
	// calculates weights for each item from the timeline based on
	// currentMousePosition: y position into the heights
	function determineHeights(currentMousePosition) {
		// super easy corner case
		if (allHeights.length === 1) {
			return allHeights[0];
		}
		// find out which item should be the item in focus (under mouse) by consulting the precalculated yBorders
		var nextCentersIdx = 0;
		if (currentMousePosition < 0) {
			//first decode the number: -currentMousePosition -1
			//then +1, as we're looking for the _next_centersIdx, not _current_
			nextCentersIdx = (-currentMousePosition - 1) + 1;
		} else {
			while (nextCentersIdx<yBorders.length && currentMousePosition >= yBorders[nextCentersIdx]) {
				++nextCentersIdx;
			}
		}
		// some corner cases with easy answers
		if (nextCentersIdx < 1) {
			return allHeights[1];
		}
		if (nextCentersIdx === yBorders.length) {
			return allHeights[nextCentersIdx-1];
		}

		// we're somewhere in the middle of the timeline. The answer is the weighted average of the sets of borders for
		// two situations:
		// - if we had the previous item in focus
		// - if we had the current item fully in focus
		// this is to calculate a smooth transition between the two stages as we move the mouse between the two cases
		var leftWeight = currentMousePosition < 0 ? 0.5 : map(currentMousePosition, yBorders[nextCentersIdx-1], yBorders[nextCentersIdx], 1, 0);
		var leftColumnWeights = allHeights[nextCentersIdx-1];
		var rightColumnWeights = allHeights[nextCentersIdx];
		var columnWeights = arrayAverage(leftColumnWeights, rightColumnWeights, leftWeight);
		return columnWeights;
	}
	function formatBigPrecisionForPixels(value) {
		return Math.round(value * 10) / 10;
	}
	var lastFocusElement = null;
	function updateSizingForYLocation(yLocation) {
		var heights = determineHeights(yLocation);
		var totalY = 0;
		var topOfScreen = (scroller !== null ? -scroller.y : 0);
		var bottomOfScreen = topOfScreen + wrapperElement.height();
		var focusY = lastMouseClientY + topOfScreen;
		if (lastFocusElement !== null) {
			// lastFocusElement can be an .item with .subitem having focus
			lastFocusElement.removeClass('focus')
				.find('.focus').removeClass( 'focus' );
			lastFocusElement = null;
		}
		var topElement = elements[0];
		var lastElement = elements[elements.length-1];
		elements.each(
			function(idx, element) {
				var thisHeight = heights[idx];
				// use DOM without jQuery - this is happening far too much to pay jQuery's overhead
				element.style.height = formatBigPrecisionForPixels(thisHeight) + 'px';
				element.style.top = formatBigPrecisionForPixels(totalY) + 'px';

				// for timespanElement
				if (totalY <= topOfScreen && totalY + thisHeight >= topOfScreen) {
					topElement = element;
				} else if (totalY <= bottomOfScreen && totalY + thisHeight >= bottomOfScreen) {
					lastElement = element;
				}

				// for focus
				if (lastFocusElement === null && totalY <= focusY && focusY < totalY + thisHeight) {
					var $this = $(element);
					lastFocusElement = $this;
					$this.addClass('focus');
					if ($this.hasClass('selected')) {
						var subY = totalY;
						$this.find('.subitem').each(function() {
							var $thisSub = $(this);
							var thisSubHeight = $thisSub.outerHeight();
							if (focusY <= subY + thisSubHeight) {
								$thisSub.addClass('focus');
								return false;
							}
							subY += thisSubHeight;
						});
					}
				}
				totalY += thisHeight;
			}
		);
		if (timespanElement !== null) {
			timespanElement.html( $(topElement).data( 'year' ) + '&thinsp;&mdash;&thinsp;' + $(lastElement).data( 'year' ) );
		}
	}
	var focusElementHeight = 0;
	function updateFocusElement() {
		if (focusElement === null || isDragging) {
			return;
		}
		var wrapperHeight = wrapperElement.height();
		if (totalHeight > wrapperHeight) {
			focusElementHeight = Math.max(MIN_FOCUS_ELEMENT_HEIGHT, Math.floor(wrapperHeight / totalHeight * wrapperHeight));
			var scrollProgress = Math.max(0, Math.min(-scroller.y / (totalHeight - wrapperHeight), 1)); // [0,1]
			var top = Math.floor(scrollProgress * (wrapperHeight - focusElementHeight));
			focusElement[0].style.top = top + 'px';
			focusElement[0].style.height = focusElementHeight + 'px';
			focusElement.show();
		} else {
			focusElement.hide();
		}
	}
	function onScroll() {
		lastScrollY = scroller.y;
		updateFocusElement();
		onMove();
	}
	function onMove() {
		var yCoord = lastMouseClientY + (-scroller.y);
		yCoord = Math.max(Math.min(yCoord, totalHeight), 0);
		updateSizingForYLocation(yCoord)
	}
	function onMoveFromTouchCoord(yCoord) {
		lastMouseClientY = yCoord;
		onMove();
	}
	function onMouseMove(event) {
		lastMouseClientY = event.clientY;
		onMove();
	}
	function getYCoordinateFromTouchEvent(event) {
		var touches = event.originalEvent.touches;
		if (touches.length === 0) {
			return lastMouseClientY;
		}
		var touch = touches[0];
		return touch.clientY;
	}
	// All touch handlers do whatever they can to cancel as much of the default behaviour as possible.
	// Side consequence is that we have to detect click ourselves.
	var lastTouchStartTime = 0;
	var lastTouchStartElement = null;
	var waitForClickY = 0;
	var waitForClickTimeoutId = -1;
	var clickDetectionDelay = 300;

	function onTouchStart(event) {
		event.stopPropagation();
		event.preventDefault();

		waitForClickY = getYCoordinateFromTouchEvent(event);

		// remember a bit of environment from the gesture start moment
		lastTouchStartTime = new Date().getTime();
		// determine the element under tap here, as due to the gesture the elements can reorder
		// so we don't want to trigger event on the wrong element in onTouchEnd
		lastTouchStartElement = null;
		var scrollTop = (scroller !== null ? -scroller.y : 0);
		var yToLookForElementWith = waitForClickY + scrollTop;
		var thisTop = 0;
		wrapperElement.find('.clickable').each(function() {
			var thisHeight = $(this).outerHeight();
			if (thisTop <= yToLookForElementWith && yToLookForElementWith <= thisTop + thisHeight) {
				lastTouchStartElement = $(this);
				return false; // no need to continue
			}
			thisTop += thisHeight;
		});


		if (lastTouchStartElement !== null)
		{
			// don't execute the movement yet, wait till we confirm it's not a click
			waitForClickTimeoutId = setTimeout(function() {
				waitForClickTimeoutId = -1;
				onMoveFromTouchCoord(waitForClickY);
			}, clickDetectionDelay);
		} else {
			waitForClickTimeoutId = -1;
			onMoveFromTouchCoord(waitForClickY);
		}

		return false;
	}
	function onTouchMove(event) {
		event.stopPropagation();
		event.preventDefault();

		waitForClickY = getYCoordinateFromTouchEvent(event);
		if (waitForClickTimeoutId >= 0) {
			// still within click detecting period, don't move
		} else {
			onMoveFromTouchCoord(waitForClickY);
		}

		return false;
	}
	function onTouchEnd(event) {
		event.stopPropagation();
		event.preventDefault();
		if (waitForClickTimeoutId >= 0)
		{
			// this is a click
			clearTimeout(waitForClickTimeoutId);
			waitForClickTimeoutId = -1;

			// trigger the right action
			if (lastTouchStartElement.hasClass('subitem'))
			{
				selectSegment.call( lastTouchStartElement[0] );
			} else {
				openTimelineItem.call( lastTouchStartElement[0] );
			}

			lastTouchStartElement = null;
			lastTouchStart = 0;
		}
		// else: this was just a move, we already updated display, nothing more to do
		return false;
	}
	function fwdToScroller(event) {
		scroller.handleEvent(event.originalEvent);
	}
	function cancelWasDragging() {
		wasDragging = false;
	}
	function setUpFocusElement() {
		if (focusElement !== null) {
			return;
		}
		timespanElement = $('<div class=timespan>');
		focusElement = $('<div id=timelineFocus>')
			.append('<div class=focusGrabber style="left:0">')
			.append('<div class=focusGrabber style="right:0">')
			.append(timespanElement)
			.appendTo(wrapperElement)
			// these events somehow are not propagated to the IScroller, we should forward them ourselves,
			// otherwise trying to scroll whilst over the focus element yields no results
			.on('wheel', fwdToScroller)
			.on('mousewheel', fwdToScroller)
			.on('DOMMouseScroll', fwdToScroller)
			// click should be interpreted against the actual timeline
			// (again, it doesn't go through on its own)
			.on('click', function( event ) {
				if (wasDragging) {
					return;
				}
				var subitem = wrapperElement.find('.subitem.focus');
				if (subitem.length > 0) {
					selectSegment.call( subitem[0] );
					return;
				}
				var item = wrapperElement.find('.item.focus');
				if (item.length > 0) {
					openTimelineItem.call( item[0] );
				}
			})
			.draggable({
				scroll: false,
				axis: 'y',
				containment: "parent",
				start: function (event, ui) {
					isDragging = true;
				},
				drag: function (event, ui ) {
					var wrapperHeight = wrapperElement.height();
					var progress = ui.position.top / (wrapperHeight - focusElementHeight);
					scroller.scrollTo(0, -((totalHeight - wrapperHeight) * progress));
				},
				stop: function(event, ui) {
					isDragging = false;
					wasDragging = true;
				}
			});
		if (isTouchDevice)
		{
			wrapperElement
				.on('touchstart', onTouchStart)
				.on('touchmove', onTouchMove)
				.on('touchend', onTouchEnd)
				.on('touchcancel', onTouchEnd);
		}
		else
		{
			focusElement.on('mousedown', cancelWasDragging)
		}
	}
	function updatePrevNextArticle(prevTimelineElement, nextTimelineElement) {
		var prevWrapperEl = $('.prevArticle');
		var nextWrapperEl = $('.nextArticle');
		if (prevWrapperEl.length ===0 || nextWrapperEl.length === 0) {
			return;
		}

		if (prevTimelineElement !== null) {
			prevWrapperEl.show();
			prevWrapperEl.find('a')
				.attr('href', $(prevTimelineElement).data('location'));
		} else {
			prevWrapperEl.hide();
		}
		if (nextTimelineElement !== null) {
			nextWrapperEl.show();
			nextWrapperEl.find('a')
				.attr('href', $(nextTimelineElement).data('location'));
		} else {
			nextWrapperEl.hide();
		}

		if (prevTimelineElement !== null && nextTimelineElement !== null) {
			$('.prevNextSep').show();
		} else {
			$('.prevNextSep').hide();
		}
	}

	// public API of SizingMaster

	// init just installs the mousemove/resize handler. should only be ever called once
	function initIScroll() {
		if (scroller !== null) {
			scroller.destroy();
			scroller = null;
		}

		scrollWrapperElement.children().wrapAll('<div class=wrapperWrapper>');
		scrollWrapperElement.find('.wrapperWrapper').css('height', totalHeight);

		scroller = new IScroll( scrollWrapperElement[0], {
			disableMouse: isTouchDevice,
			disableTouch: isTouchDevice,
			disablePointer: isTouchDevice,
			mouseWheel: true,
			scrollbars: false,
			bounce: false,
			probeType: 2,
			preventDefault: true,
			tap: true
		} );
		$(window).resize(onScroll);
		scroller.on('scroll', onScroll);

		setUpFocusElement();
	}

	function init(aWrapperElement) {
		wrapperElement = aWrapperElement;
		scrollWrapperElement = wrapperElement.find( '.scrollWrapper' );
		wrapperElement.mousemove(onMouseMove);
	}

	function updateSubItemsHeights() {
		var selected = elements.filter('.selected');
		if (selected.length === 0) {
			return;
		}
		// calculate heights for the selected article's clusters
		var clusters = selected.find('.subitem');
		var clusterCount = clusters.length;
		var selectedHeight = selected.height();
		var minClusterHeight = defaultMinClusterHeight;
		var heightForMinHeight = minClusterHeight * clusterCount;
		if (heightForMinHeight > selectedHeight) {
			// sanity in case we are so small, we can't guarantee the min height
			heightForMinHeight = selectedHeight;
			minClusterHeight = heightForMinHeight / clusterCount;
		}
		var scalableHeight = Math.max(0, selectedHeight - heightForMinHeight);

		clusters.css('height', function() {
			var cluster = $(this);
			var thisFraction = cluster.data('contentFraction');
			var thisHeight = minClusterHeight + thisFraction * scalableHeight;

			return thisHeight;
		});
	}

	function chooseMouseLocationAndScroll() {
		var cookieLocation = docCookies.getItem(timelineLocationCookieName);
		if (cookieLocation !== null) {
			docCookies.removeItem(timelineLocationCookieName);
			var split = cookieLocation.split(':');
			if (split.length === 2) {
				lastMouseClientY = parseInt(split[0]);
				scroller.scrollBy(0, parseInt(split[1]));
				return;
			}
		}

		var yLocation = 0;
		if (selectedArticleIdx >= 0) {
			// focus on the selected article, try to position it in the middle
			yLocation = yBorders[selectedArticleIdx];
			if (selectedArticleIdx+1 < yBorders.length) {
				yLocation += yBorders[selectedArticleIdx+1];
				yLocation /= 2;
			}
			var wrapperHeight = wrapperElement.height();
			if (yLocation > wrapperHeight/2 && totalHeight > wrapperHeight) {
				var scrollBy = yLocation - wrapperHeight/2;
				scrollBy = Math.min(scrollBy, totalHeight - wrapperHeight);
				scroller.scrollBy(0, -scrollBy);
				yLocation -= scrollBy;
			}
		}
		lastMouseClientY = yLocation;
	}

	// recalculates the necessary data for when the page is loaded,
	// a new set of items is installed (e.g. filtering), or page is resized
	function newResizeables(newElements) {
		// remember what's given
		elements = newElements;
		lastFocusElement = null;

		selectedArticleIdx = -1;
		var selected = null;
		elements.each(function(idx) {
			if ($(this).hasClass('selected')) {
				selectedArticleIdx = idx;
				selected = $(this);
				return false;	// don't continue .each
			}
		});
		var prevArticleElement = selectedArticleIdx > 0 ? elements[selectedArticleIdx - 1] : null;
		var nextArticleElement = (selectedArticleIdx >= 0 && selectedArticleIdx < elements.length - 1) ? elements[selectedArticleIdx + 1] : null;
		updatePrevNextArticle(prevArticleElement, nextArticleElement);
		var clusters = selected !== null ? selected.find('.subitem') : [];
		var clusterCount = clusters.length;

		detailedArticleHeight = Math.max(2 * highlightedArticleHeight, defaultMinClusterHeight * clusterCount);
		totalHeight = determineTotalHeight();

		if (debugTimeline) {
			console.log(
				"elements.length=" + elements.length +
				" stdArticleHeight=" + stdArticleHeight +
				" highlightedArticleHeight=" + highlightedArticleHeight +
				" detailedArticleHeight=" + detailedArticleHeight +
				" selectedArticleIdx=" + selectedArticleIdx +
				" totalHeight=" + totalHeight
			);
		}

		// recalculate
		allHeights = calculateAllHeights(elements.length, selectedArticleIdx);
		yBorders = calculateBordersOfDominatingItems(allHeights);

		initIScroll();
		chooseMouseLocationAndScroll();
		onScroll();
		updateSubItemsHeights();	// has to happen after first sizing of elements, which is triggered by onScroll
	}

	return {
		init: init,
		newResizeables: newResizeables
	};
}());

function updateTimelineSize( ) {
	if ( filteredArticles === null ) return;

	SizingMaster.newResizeables($('#timeline .item'));

	updateTimelineHighlight( );
}

function extractSnippetForTimeline( cluster ) {
	if (cluster.length === 0) {
		return '';
	}
	var snippetSource;
	var header = cluster.find( 'h2' );
	if (header.length > 0) {
		snippetSource = $( header[0] ).clone();
	} else {
		var paragraphs = cluster.find('p');
		if (paragraphs.length === 0) {
			return '';
		}
		snippetSource = $( paragraphs[0] ).clone();
	}
	snippetSource.find('.sup').remove();
	snippetSource.find('figure').remove();
	var snippet = snippetSource.text().trim();
	snippetSource.remove();
	return snippet;
}

function setUpSegmentOnTimeLineForCurrentArticle( segment ) {
	function appendSubItem( snippet, heightFraction, clusterIdx ) {
		var headline = snippet.substr( 0, Math.min( headlinemaxlength, snippet.length ) );

		if ( snippet.length != headline.length ) {
			headline = headline.split( ' ' );
			headline.pop( );
			headline = headline.join( ' ' );
			headline += '&hellip;';
		}

		var subitem =
		$(
			'<div style="height: 1px" class="subitem clickable" id="subitem-' + idx + '">' +
				'<div>' + headline + '</div>' +
			'</div>'
		)
			.data( {
				contentFraction: heightFraction,
				clusterId: 'cluster-' + clusterIdx
			})
			.on( 'tap', selectSegment ) /* iscroller generates taps */
		;

		return subitem;
	}

	var heights = [ ];
	var totalHeight = 0;
	var snippets = [ ];
	var allClusters = $( '#text div[id^=cluster]' );

	var hadAnySnippetsFromOutsideAbstract = false;
	allClusters.each( function ( index, cluster ) {
		if (index == 0) {
			return;
		}
		var thisSnippet = extractSnippetForTimeline( $(this) );
		if (thisSnippet.length > 0 & index > 0) {
			hadAnySnippetsFromOutsideAbstract = true;
		}
		snippets.push( thisSnippet );
	} );

	var subitems = [];

	if (!hadAnySnippetsFromOutsideAbstract) {
		subitems.push(appendSubItem( extractSnippetForTimeline( $( '#text div[id=cluster-0]' ) ), 1, 0 ));
	} else {

		allClusters.each( function ( index, cluster ) {
			if (index === 0) {
				// ignore "cluster-0", which contains title, abstract, author
				return;
			}
			var thisHeight = $( this ).outerHeight( );
			heights.push( thisHeight );
			totalHeight += thisHeight;
		} );

		for ( var idx = 0; idx < heights.length; ++idx ) {
			subitems.push(appendSubItem( snippets[idx], heights[ idx ] / totalHeight, idx+1 ));
		};
	}

	segment.append(subitems);
}

function initTimelineFromFilteredArticles( ) {
	// warning. Construction of the timeline is quite expensive - a lot of DOM
	// operations here


	var timelineContentWrapper = $( '#timeline .scrollWrapper' );
	var articleIdToShowSubitems = typeof(articleid) !== "undefined" ? articleid : -1;

	var segments = [];

	$.each( filteredArticles, function( index, item ) {
		var segment = null;

		if ( item[ 'id' ] == articleIdToShowSubitems ) {
			segment =
				$( '<div class="item selected">' )
					.data( 'year', item.year );
			setUpSegmentOnTimeLineForCurrentArticle( segment );
		}
		else
		{
			segment =
				$(
					'<div class="item clickable">' +
						'<div class=titleOnlyItem>' + item[ 'title' ] + '</div>' +
						'<div class=mainContributor>' + item[ 'mainContributor' ] + '</div>' +
					'</div>'
				)
				.data( {
					year: item.year,
					location: item[ 'url_title' ]
				} )
			;
		}

		segments.push(segment);
	});

	timelineContentWrapper.append(segments);
	timelineContentWrapper.find('div.item.clickable').on('tap', openTimelineItem);
	updateTimelineSize( );
}




// ## TIMELINE FILTERING ############################################################# //

function sizeFilters() {
	var windowHeight = getWindowHeight();
	var allOptionsHeight = windowHeight - 30; // leave some for the search bar
	$('#timeline-options').css('max-height', allOptionsHeight);
	allOptionsHeight -= 30; // leave some padding

	var optiongroups = $('.optiongroup');
	// subtract space for filter tag headers
	var optiongroupheight = allOptionsHeight - optiongroups.length * (25 + 9);
	var rowHeight = 28;
	var rowsFitting = Math.floor(optiongroupheight / rowHeight);
	var remainder = optiongroupheight - rowsFitting * rowHeight;
	if (remainder < 14) {
		optiongroupheight = (rowsFitting-1) * rowHeight + rowHeight / 2;
	} else if (remainder > 14) {
		optiongroupheight = rowsFitting * rowHeight + rowHeight / 2;
	}
	optiongroups.css('max-height', optiongroupheight);
}
$(window).resize(sizeFilters);

var lastClickedFilterType;

function saveFilterInCookies( filter ) {
	var filterString = JSON.stringify( filter );
	var exp = new Date();
	// it's just a very transient setting, we don't want to surprise the user with the filter selection
	// when s/he comes back a few days later and doesn't even remember what it's all about
	exp.setDate(exp.getDate() + 1);
	docCookies.setItem( 'open_filters', filterString, exp );
}

function filterTimelineForIssue( issueNumberPrefix ) {
	issueNumberPrefix = String(issueNumberPrefix);
	var prefixLength = issueNumberPrefix.length;
	filteredArticles = [];
	filteredArticles = allArticles.filter(function(article) {
		var seq = String(article.sequence || "");
		return seq.substring(0, prefixLength) === issueNumberPrefix;
	});
	if (filteredArticles.length === 0) {
		filteredArticles = allArticles;
	} else {
		filteredArticles.sort(articleSorterForIssueNumber);
	}

	saveFilterInCookies( {} );
	$( '#timeline .scrollWrapper' ).empty( );
	initTimelineFromFilteredArticles( );
}

function filterTimeline( currentFilters ) {

	filteredArticles = [];
	filteredArticles = allArticles.filter(function(article) {

		for (var i in currentFilters) {

			var matches = true;

			// ## CHECK IF THE FILTER PROPERTY IS A STRING OR AN ARRAY (OF TAGS)
			if ( article[ i ] === null) {
				matches = false;
			}
			else if ( typeof article[ i ] == 'object' ) {

				if ( article[ i ].length > 0) {
					// CHECK TO SEE IF ONE OF THE ARRAY-ITEMS EQUALS THE FILTER VALUE
					for ( var n = 0; n < currentFilters[ i ].length && matches; ++n ) {
						matches &= article[ i ].indexOf( currentFilters[ i ][ n ] ) >= 0;
					}
				} else {
					matches = false;
				}

			} else {

				// ## CHECK FOR AN EXACT MATCH IF THE FILTER PROPERTY IS A STRING
				matches &= ( article[ i ] === currentFilters[ i ][ 0 ] );
			}

			if (!matches) {
				// no need to iterate over more filter options, this article falls out
				return false;
			}
		}

		return true;
	});

	if ('theme' in currentFilters) {
		filteredArticles.sort(articleSorterForThemeFilter);
	} else {
		filteredArticles.sort(articleSorter);
	}

	$('.option').addClass('notSelectable');

	for (var filterType in allPossibleFilterTypes) {
		var filterMenu = $('.filter-option[filtername="'+ filterType +'"]' );
		for (var x in filteredArticles) {

			var filterValue = filteredArticles[x][filterType];
			if (filterValue == null) {
				continue;
			}

			if ( typeof filterValue == 'object' ) {
				filterMenu.find( '.option' ).each( function( ) {
					if ( filterValue.indexOf( $( this ).attr( 'value' ) ) != -1 )
						$( this ).removeClass( 'notSelectable' );
				} );

			} else {
				filterMenu.find( '.option[value="' + filterValue + '"]' )
					.removeClass( 'notSelectable' );
			}
		}
	}

	if ( filteredArticles.length == 0 ) {
		var currentFilterValue = currentFilters[ lastClickedFilterType ];
		currentFilters = { };
		currentFilters[ lastClickedFilterType ] = currentFilterValue;
		filterTimeline( currentFilters );
		return;
	}

	saveFilterInCookies( currentFilters );

	$( '#timeline .scrollWrapper' ).empty( );
	initTimelineFromFilteredArticles( );
}

function initialFilters( ) {

	$('.filter-option').each(function() {

		var filterType = $(this).attr('filtername') ;
		allPossibleFilterTypes[ filterType ] = [];

		for (var i = 0; i < allArticles.length; ++i) {
			var thisFilterValue = allArticles[ i ][ filterType ];

			// add thisFilterValue to all possible values, only if it's not there yet
			if ( typeof thisFilterValue == 'object' ) {
				for ( var n in thisFilterValue ) {
					var thisFilterItemValue = thisFilterValue[ n ];

					if ( allPossibleFilterTypes[ filterType ]
							.indexOf( thisFilterItemValue ) === -1 ) {
						allPossibleFilterTypes[ filterType ].push( thisFilterItemValue );
					}
				}
			} else if ( allPossibleFilterTypes[ filterType ].indexOf( thisFilterValue ) === -1 ) {
				allPossibleFilterTypes[ filterType ].push( thisFilterValue );
			}
		}

		// sort the filter vales, except for themes, where we want them to show up
		// in the 'most recent' order, which is how they are sorted after arriving from the server
		if ( filterType != 'theme' ) {
			allPossibleFilterTypes[ filterType ].sort();
			if ( filterType == 'year' ) {
				allPossibleFilterTypes[ filterType ].reverse();
			}
		}
	})
}

function getCurrentFilters() {
	var currentFilters = {};
	$('#timeline-options .option.selected').each(function(index){
		var filterOption = $(this).parents('.filter-option').attr('filtername');
		if ( ! ( filterOption in currentFilters ) ) {
			currentFilters[ filterOption ] = [ ];
		}
		// append this value to the list of filter options
		currentFilters[ filterOption ].push( $(this).attr('value') );
	});
	return currentFilters;
}

function initTimelineFilters( ) {

	////////// Initialize filter menu action handlers
	function updateOptionGroupsForNewFilters() {
		$('.filter-option').each(function() {
			if ($(this).find('.option.selected').length > 0) {
				$(this).addClass('selected');
			} else {
				$(this).removeClass('selected');
			}
		});
	}
	function clearFilter( event ) {
		// prevent propagation of this event to the parent (filter-header) which would collapse/extand this filter
		event.stopPropagation();

		var thisSelected = $(this).parents().siblings('.optiongroup').find('.selected');
		var notSelectableOnThat = $(this).parents('.filter-option').siblings('.filter-option').find('.notSelectable');

		$(this).hide();
		thisSelected.removeClass('selected');
		notSelectableOnThat.removeClass('notSelectable');

		updateOptionGroupsForNewFilters();

		filterTimeline( getCurrentFilters() );
	}
	function isFilterOptionCollapsed(fo) {
		return !fo.hasClass('filter-expanded');
	}
	function toggleFilterCollapse() {
		var thisOption = $(this).parents('.filter-option');
		if (isFilterOptionCollapsed(thisOption))
		{
			// we're expanding this filter, collapse all the others
			$('.filter-option').removeClass('filter-expanded');
		}
		thisOption.toggleClass('filter-expanded');
	}
	function resetFilterMenu() {
		$('.option.selected').removeClass('selected');
		$('.notSelectable').removeClass('notSelectable');
		updateOptionGroupsForNewFilters();
	}
	function applyFilter( toThis ) {
		var isSelectable = !toThis.hasClass( 'notSelectable' );

		var thisFilterContainer = $(toThis).parents('.filter-option');
		var allFilterElementsOnThis = thisFilterContainer.find('.option');

		if( !isSelectable ) {
			resetFilterMenu();
		}

		lastClickedFilterType = thisFilterContainer.attr( 'filtername' );

		toThis.toggleClass('selected');

		updateOptionGroupsForNewFilters();
	}
	function filterSelected( ) {
		applyFilter( $(this) );
		filterTimeline( getCurrentFilters() );
	}

	////////// Add the filter elements
	function createFilterElement( val ) {
		return $('<div>')
			.text( val )
			.attr({'value': val, 'class': 'option' });
	}

	// auto generate UI elements
	$('.filter-option').each( function() {
		var $this = $(this);
		$this.append('<div class=optiongroup />');
		$this.find('.filter-header')
			.prepend( '<span class="filter-ui filter-expand">&nbsp;</div>' ) // filled rightwards arrow
			.prepend( '<span class="filter-ui filter-collapse">&nbsp;</div>' ) // filled downwards arrow
			.append( '<span class="filter-ui filter-clear">&#215;</span>' );
	});

	var anyFiltersActive = false;

	// try and parse the filters from the cookies
	var initialFilterParms = docCookies.getItem( 'open_filters' );
	try {
		if (initialFilterParms != null) {
			initialFilterParms = JSON.parse(initialFilterParms);
		} else {
			initialFilterParms = {};
		}
	} catch (exception) {
		initialFilterParms = {};
	}

	// for every filters' optiongroup
	$('#timeline-options .filter-option .optiongroup')
		.each(function() {
			var filterType = $(this).parent().attr('filtername');

			for ( var i = 0 ; i < allPossibleFilterTypes[ filterType ].length; ++i ) {
				var filterValue = allPossibleFilterTypes[ filterType ][ i ];
				var filterElem = createFilterElement( filterValue );
				filterElem.appendTo( $(this) );

				// Sync the filters parameters with the parameters Stored in Session
				try {
					if ( $.isArray( initialFilterParms[ filterType ] ) && initialFilterParms[ filterType ].indexOf( filterValue ) >= 0 ) {
						applyFilter( filterElem );
						anyFiltersActive = true;
					}
				} catch (exc) {
					// ignore - restoring the filters should not blow up the interface
					// if something goes wrong, just ignore the filter
				}
			}
	});

	if (anyFiltersActive) {
		$('#TagFilterOptions').removeClass('filter-expanded');
	}

	filterTimeline( getCurrentFilters() );

	$( '#timeline-options .filter-clear' ).click( clearFilter );
	$( '#timeline-options .filter-header' ).click( toggleFilterCollapse );
	$( '#timeline-options .optiongroup .option' ).click( filterSelected );
	sizeFilters();

	$( 'a.filterlink' )
		.attr('href', '#')
		.click( function() {
			var type = $(this).attr('filtertype');
			var value = $(this).attr('filtervalue');

			if (type === "contenttype") {
				type = "type";
				value = value.toLowerCase();
			}

			var didFilter = false;
			if (type === "issue") {
				resetFilterMenu();
				filterTimelineForIssue( value );
				didFilter = true;
			}
			else
			{
				var foElement = $('.filter-option[filtername="' + type + '"]')
				var optionElement = foElement.find('.option[value="' + value + '"]');
				if (optionElement.length === 1) {
					var wasThisSelected = optionElement.hasClass('selected');
					if (!wasThisSelected) {
						resetFilterMenu();
					}
					if (isFilterOptionCollapsed(foElement)) {
						foElement.find('.filter-header').click();
					}
					optionElement.click();
					didFilter = true;
				}
			}

			if (didFilter) {
					if (typeof(SidebarManager) !== 'undefined' && SidebarManager !== null) {
						SidebarManager.showAllIfHidden();
					}
			}

			return false;
		} );
}


// ## INIT TIMELINE ################################################################## //
var ds = new Miso.Dataset({
	url: 'timeline.php',
	idAttribute: 'id',
	delimiter: ',',
	columns: [
		{name: 'id', type: 'number'},
		{name: 'url_title', type: 'string'},
		{name: 'title', type: 'string'},
		{name: 'sequence', type: 'number'},
		{name: 'datePublished', type: 'string'},
		{name: 'theme', type: 'string'},
		{name: 'type', type: 'string'},
		{name: 'yearPublished', type: 'number'},
		{name: 'tags', type: 'string'},
		{name: 'main_contributor', type: 'string'}
	]
});

ds.fetch( { success: function( ) {
	SizingMaster.init( $( '#timeline' ) );

	parseArticles( ds );
	filteredArticles = allArticles;

	initialFilters( );
	initTimelineFilters( );

	$( window ).scroll( updateTimelineHighlight );
} } );

} );
