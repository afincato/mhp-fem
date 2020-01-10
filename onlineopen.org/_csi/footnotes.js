var Footnotes = (function() {

// ## UPDATE COLUMN HEIGHT AFTER SCREEN RESIZE ####################################### //

function updateFootnoteColumnHeight( lastFootnoteBtm ) {

	var textheight = $( '#text' ).outerHeight( ) + 32;

	$( '#content, #footnotes' ).height( Math.max( textheight, lastFootnoteBtm ) );
}

// ## GRADIENT COLOURING OF TEXT LEADING TO A FOOTNOTE REFERENCE ##################### //

function colourTextBeforeFootnoteReferences( content ) {
	var SUP_SPAN_START = '<span class="sup">';
	var SUP_SPAN_END = '</span>';
	var BLACK_START = '<span class="black">';
	var BLACK_END = '</span>';
	var XLINK_START = '<a class="crosslink"';
	var XLINK_END = '</a>';
	var TYPE_SUP = 'sup';
	var TYPE_XLINK = 'xlink';
	var PREFOOTNOTE_ZONE_LENGTH = 50;
	var BLACK_ZONE_LENGTH = 100;
	var GREEN_ZONE_LENGTH = 100;

	var CMD_PREFOOTNOTE_ZONE_START = 1;
	var CMD_PREFOOTNOTE_ZONE_END = 2;

	var CMD_PREXLINK_ZONE_START = 3;
	var CMD_XLINK_ZONE_START = 4;
	var CMD_XLINK_ZONE_END = 5;
	var CMD_POSTXLINK_ZONE_END = 6;

	var CMD_PREBLACK_ZONE_START = 7;
	var CMD_BLACK_ZONE_START = 8;
	var CMD_BLACK_ZONE_END = 9;
	var CMD_POSTBLACK_ZONE_END = 10;

	var CMD_CLOUD_PREBLACK_ZONE_START = 11;
	var CMD_CLOUD_BLACK_ZONE_START = 12;
	var CMD_CLOUD_BLACK_ZONE_END = 13;
	var CMD_CLOUD_POSTBLACK_ZONE_END = 14;

	var CMD_GREEN_START = 15;
	var CMD_GREEN_END = 16;

	var BLACK_GREYNESS = 224;
	var BLACK_CLOUD_GREYNESS = 153;

	function findPrefootnoteZonePoints(html) {
		var ret = [];
		var lastEndIdx = 0;
		var thisStartIdx = 0;
		while ((thisStartIdx = html.indexOf(SUP_SPAN_START, lastEndIdx)) >= 0) {
			var endIdx = html.indexOf(SUP_SPAN_END, thisStartIdx);
			if (endIdx < 0) {
				// oops!
				return;
			}
			var prefootnote_zone_txt = html.substring(lastEndIdx, thisStartIdx);
			var counts = countColourableCharacters(prefootnote_zone_txt, PREFOOTNOTE_ZONE_LENGTH, prefootnote_zone_txt.length, -1);
			endIdx += SUP_SPAN_END.length;
			if (counts[1] > 1) {
				ret.push({
					index: lastEndIdx + counts[0],
					command: CMD_PREFOOTNOTE_ZONE_START,
					stepCount: (counts[1]-1)
				});
				ret.push({
					index: thisStartIdx,
					command: CMD_PREFOOTNOTE_ZONE_END,
					skip: endIdx - thisStartIdx
				});
			}
			lastEndIdx = endIdx;
		}
		return ret;
	}

	function findZonePoints(html, startTag, endTag, prePostZoneLength, baseCmd) {
		var cmd_preZoneStart = baseCmd;
		var cmd_zoneStart = cmd_preZoneStart + 1;
		var cmd_zoneEnd = cmd_zoneStart + 1;
		var cmd_postZoneEnd = cmd_postZoneEnd + 1;

		var ret = [];
		var lastEndIdx = 0;
		var thisStartIdx = 0;
		while ((thisStartIdx = html.indexOf(startTag, lastEndIdx)) >= 0) {
			var endIdx = html.indexOf(endTag, thisStartIdx);
			if (endIdx < 0) {
				// oops!
				return [];
			}
			var prefootnote_zone_txt = html.substring(lastEndIdx, thisStartIdx);
			var backwardsCount = countColourableCharacters(prefootnote_zone_txt, prePostZoneLength, prefootnote_zone_txt.length, -1);
			if (ret.length > 0) {
				// there is another croslink before us, we need to generate CMD_POSTXLINK_ZONE_END for it,
				// and maybe share the space for the gradient fade-out/fade-in
				var fwdCount = countColourableCharacters(prefootnote_zone_txt, prePostZoneLength, prefootnote_zone_txt.length, 1);
				if (fwdCount[1] < 3) {
					ret.push({
						index: lastEndIdx,
						command: cmd_postZoneEnd
					});
				} else {
					if (fwdCount[0] > backwardsCount[0]) {
						// we have to share
						var totalAvailableChars = countColourableCharacters(prefootnote_zone_txt, prefootnote_zone_txt.length, prefootnote_zone_txt.length, 1)[1];
						var charsPerZone = Math.floor((totalAvailableChars-1)/2);
						// recount
						fwdCount = countColourableCharacters(prefootnote_zone_txt, charsPerZone, prefootnote_zone_txt.length, 1);
						backwardsCount = countColourableCharacters(prefootnote_zone_txt, charsPerZone, prefootnote_zone_txt.length, -1);
					}
					// else: there is relaxed space for the prev's fade out and this one's fade in
					ret[ret.length-1].stepCount = (fwdCount[1]-1);
					ret.push({
						index: lastEndIdx + fwdCount[0],
						command: cmd_postZoneEnd
					});
				}
			}
			endIdx += endTag.length;
			if (backwardsCount[1] > 1) {
				ret.push({
					index: lastEndIdx + backwardsCount[0],
					command: cmd_preZoneStart,
					stepCount: (backwardsCount[1]-1)
				});
			}
			ret.push({
				index: thisStartIdx,
				command: cmd_zoneStart
			});
			ret.push({
				index: endIdx,
				command: cmd_zoneEnd
			});
			lastEndIdx = endIdx;
		}
		if (ret.length > 0 && lastEndIdx < html.length) {
			var postfootnote_zone_txt = html.substring(lastEndIdx);
			var counts = countColourableCharacters(postfootnote_zone_txt, prePostZoneLength, postfootnote_zone_txt.length, 1);
			if (counts[1] > 1) {
				ret[ret.length-1].stepCount = (counts[1]-1);
				ret.push({
					index: lastEndIdx + counts[0],
					command: cmd_postZoneEnd
				});
			}
		}
		return ret;
	}
	function processInlineExtraInfo(html) {
		// assert span.hasClass('inlineExtraInfo');
		var colourableLength = countColourableCharacters(html, GREEN_ZONE_LENGTH, html.length, +1);
		var commands = [];
		commands.push({
			index: 0,
			command: CMD_GREEN_START,
			stepCount: colourableLength[1]
		});
		commands.push({
			index: colourableLength[0],
			command: CMD_GREEN_END
		});
		return commands;
	}

	function findImportantPoints(p, html) {
		if (p.hasClass('grey')) {
			return findZonePoints(html, BLACK_START, BLACK_END, BLACK_ZONE_LENGTH, CMD_PREBLACK_ZONE_START);
		}
		if (p.hasClass('cloudgrey')) {
			return findZonePoints(html, BLACK_START, BLACK_END, BLACK_ZONE_LENGTH, CMD_CLOUD_PREBLACK_ZONE_START);
		}
		if (p.hasClass('inlineExtraInfo')) {
			return processInlineExtraInfo(html);
		}

		/* red channel */
		var supPoints = findPrefootnoteZonePoints(html);

		/* blue channel */
		var xlinkPoints = findZonePoints(html, XLINK_START, XLINK_END, PREFOOTNOTE_ZONE_LENGTH, CMD_PREXLINK_ZONE_START);

		if (supPoints.length === 0) {
			return xlinkPoints;
		}
		if (xlinkPoints.length === 0) {
			return supPoints;
		}

		// merge the 2 arrays, make sure result is sorted on .start
		var ret = [];

		while (supPoints.length > 0 && xlinkPoints.length > 0) {
			var nextEl = null;
			if (supPoints[0].index < xlinkPoints[0].index) {
				nextEl = supPoints[0];
				supPoints = supPoints.slice(1);
			} else {
				nextEl = xlinkPoints[0];
				xlinkPoints = xlinkPoints.slice(1);
			}
			// todo check for overlap
			ret.push(nextEl);
		}

		if (supPoints.length > 0) {
			ret = ret.concat(supPoints);
		}
		else if (xlinkPoints.length > 0) {
			ret = ret.concat(xlinkPoints);
		}

		return ret;
	}
	function wrapWithGradient(txt, runningColour, colourDelta) {
		if (txt === "") {
			return txt;
		}
		var currentIndex = 0;
		var isInTagDefinition = false;
		var isInTag = false;
		var ret = '';
		while (currentIndex < txt.length) {
			var thisChar = txt[currentIndex];
			switch (thisChar) {
				case '<':
					isInTagDefinition = !isInTagDefinition;
					break;
				case '>':
					isInTagDefinition = !isInTagDefinition;
					isInTag = !isInTag;
					break;
				default:
					if (!isInTagDefinition && thisChar !== ' ') {
						thisChar = '<span class=ftntgrdnt style="color:' + runningColour.getCssText() + '">' + thisChar + '</span>';
						runningColour.add(colourDelta);
					}
			}
			ret += thisChar;
			++currentIndex;
		}
		return ret;
	}
	function determineDefaultTextColor(p) {
		var css_color = p.css('color');
		var match = /rgba?\(([\d]+),\s*([\d]+),\s*([\d]+)[\),]/.exec(css_color);
		if (match != null) {
			return new Colour(1*match[1], 1*match[2], 1*match[3]);
		}
		return null;
	}
	function colourParagraph() {
		var p = $(this);
		var allHtml = decodeHtml(p.html());
		var allPoints = findImportantPoints(p, allHtml);
		if (allPoints.length === 0) {
			return;
		}

		var retHtml = '';
		var currentColour = new Colour(0, 0, 0);
		var currentColourDelta = new Colour(0, 0, 0);
		var lastIndex = 0;
		var defaultTextColor = determineDefaultTextColor(p);

		function flushCurrentGradient(thisIdx) {
			if (thisIdx <= lastIndex) {
				// in case there is a pathological case, like footnote in a crosslink, or something
				return;
			}
			var thisHtml = allHtml.substring(lastIndex, thisIdx);
			if (currentColourDelta.isNotBlack() || currentColour.isNotBlack()) {
				thisHtml = wrapWithGradient(thisHtml, currentColour, currentColourDelta);
			}
			retHtml += thisHtml;
			lastIndex = thisIdx;
		}
		for (var i = 0; i < allPoints.length; ++i) {
			var thisPoint = allPoints[i];
			var thisHtml = allHtml.substring(lastIndex, thisPoint.index);
			flushCurrentGradient(thisPoint.index);
			switch (thisPoint.command) {
				case CMD_PREFOOTNOTE_ZONE_START:
					if (defaultTextColor !== null) {
						// we ignore xlinks
						currentColour.r = defaultTextColor.r;
						currentColour.g = defaultTextColor.g;
						currentColour.b = defaultTextColor.b;
						currentColourDelta.r = (255-defaultTextColor.r)/thisPoint.stepCount;
						currentColourDelta.g = (0-defaultTextColor.g)/thisPoint.stepCount;
						currentColourDelta.b = (0-defaultTextColor.b)/thisPoint.stepCount;
					} else {
						currentColour.r = 0;
						currentColourDelta.r = 255/thisPoint.stepCount;
					}
					break;
				case CMD_PREFOOTNOTE_ZONE_END:
					// append the tag, no colouring
					retHtml += allHtml.substring(thisPoint.index, thisPoint.index + thisPoint.skip);
					lastIndex += thisPoint.skip;
					if (defaultTextColor !== null) {
						currentColour.r = defaultTextColor.r;
						currentColour.g = defaultTextColor.g;
						currentColour.b = defaultTextColor.b;
						currentColourDelta.r = 0;
						currentColourDelta.g = 0;
						currentColourDelta.b = 0;
					} else {
						// we ignore xlinks
						currentColourDelta.r = 0;
						currentColour.r = 0;
					}
					break;

				case CMD_PREXLINK_ZONE_START:
					currentColour.b = 0;
					currentColourDelta.b = 255/thisPoint.stepCount;
					break;
				case CMD_XLINK_ZONE_START:
					currentColour.b = 255;
					currentColourDelta.b = 0;
					break;
				case CMD_XLINK_ZONE_END:
					currentColour.b = 255;
					currentColourDelta.b = -255/thisPoint.stepCount;
					break;
				case CMD_POSTXLINK_ZONE_END:
					currentColour.b = 0;
					currentColourDelta.b = 0;
					break;

				case CMD_PREBLACK_ZONE_START:
				{
					var d = BLACK_GREYNESS / thisPoint.stepCount;
					currentColour = new Colour(BLACK_GREYNESS, BLACK_GREYNESS, BLACK_GREYNESS);
					currentColourDelta = new Colour(-d, -d, -d);
				}
				break;
				case CMD_BLACK_ZONE_START:
					currentColour = new Colour(0,0,0);	// reset to black === no gradienting in flushCurrentGradient
					currentColourDelta = new Colour(0,0,0);
					break;
				case CMD_BLACK_ZONE_END:
				{
					var d = BLACK_GREYNESS / thisPoint.stepCount;
					currentColourDelta = new Colour(d, d, d);
				}
				break;
				case CMD_POSTBLACK_ZONE_END:
					currentColour = new Colour(0,0,0);	// reset to black === no gradienting in flushCurrentGradient
					currentColourDelta = new Colour(0,0,0);
					break;

				case CMD_CLOUD_PREBLACK_ZONE_START:
				{
					var d = BLACK_CLOUD_GREYNESS / thisPoint.stepCount;
					currentColour = new Colour(BLACK_CLOUD_GREYNESS, BLACK_CLOUD_GREYNESS, BLACK_CLOUD_GREYNESS);
					currentColourDelta = new Colour(-d, -d, -d);
				}
				break;
				case CMD_CLOUD_BLACK_ZONE_START:
					currentColour = new Colour(0,0,0);	// reset to black === no gradienting in flushCurrentGradient
					currentColourDelta = new Colour(0,0,0);
					break;
				case CMD_CLOUD_BLACK_ZONE_END:
				{
					var d = BLACK_CLOUD_GREYNESS / thisPoint.stepCount;
					currentColourDelta = new Colour(d, d, d);
				}
				break;
				case CMD_CLOUD_POSTBLACK_ZONE_END:
					currentColour = new Colour(0,0,0);	// reset to black === no gradienting in flushCurrentGradient
					currentColourDelta = new Colour(0,0,0);
					break;
				case CMD_GREEN_START:
					// rgb(31,173,74)
					currentColour = new Colour(31, 173, 74);
					currentColourDelta = new Colour((127 - 31)/ thisPoint.stepCount, (127 - 173) / thisPoint.stepCount, (127 - 74)/ thisPoint.stepCount);
					break;
				case CMD_GREEN_END:
					currentColour = new Colour(127, 127, 127);
					currentColourDelta = new Colour(0, 0, 0);
					break;

				default:
					// should never happen
					break;
			}
		}
		if (lastIndex < allHtml.length) {
			retHtml += allHtml.substring(lastIndex);
		}
		p.html(retHtml);
	}

	content.find( 'p:not(:has(>.inlineExtraInfo)), li, .inlineExtraInfo' ).each(colourParagraph);
}

function simplifyUrlAndMakeItFitInSidebar() {
	var $this = $(this);
	var html = $this.html();
	if (html.indexOf(' ') >= 0 || html.indexOf('.') < 0) {
		// has spaces or doesn't have a dot - most likely not an url
		return;
	}
	$this.html( simplifyRawUrl( $this.attr( 'href' ) ) );
}

function Collection() {
	this.footnotes = [ ];
}

function Footnote(footnoteReferenceElement, footnote, isTruncatable) {
	this.footnoteReferenceElement = footnoteReferenceElement;
	this.footnote = footnote;
	this.truncationCandidate = isTruncatable;
	this.refreshReferencePosition( );
}

Footnote.prototype.refreshReferencePosition = function( ) {
	this.referencePosition = this.footnoteReferenceElement.offset( );
};

Footnote.prototype.updateFootnotePosition = function( minTop ) {
	var thisTop = Math.max( this.referencePosition.top - 6, minTop );
	this.footnote.css( 'top', thisTop );
	return thisTop + this.footnote.outerHeight( );
};



var maxFootnoteContentHeight = 10 * 13;

Collection.prototype.updatePositions = function( recalculateNaturalHeights ) {
	var nextMinTop = 0;

	for ( var idx = 0; idx < this.footnotes.length; ++idx ) {
		var thisFootnote = this.footnotes[ idx ];
		thisFootnote.refreshReferencePosition( );
		var footnoteEl = thisFootnote.footnote;

		if (thisFootnote.referencePosition.top === 0) {

			// reference element is hidden
			footnoteEl.hide();

		} else {
			footnoteEl.show();

			if (recalculateNaturalHeights === true && thisFootnote.truncationCandidate) {

				var wrapper = footnoteEl.find('.footnoteContentWrapper');

				// temporarily remove truncation (if any)
				footnoteEl.removeClass('truncated');
				wrapper.height('');

				var thisInnerHeight = thisFootnote.footnote.height();

				if (thisInnerHeight > maxFootnoteContentHeight) {
					footnoteEl
						.data( 'naturalHeight', thisInnerHeight )
						.addClass( 'truncated long' );
					wrapper.height( maxFootnoteContentHeight );
				} else {
					footnoteEl.removeClass( 'long' );
				}

			}
			nextMinTop = this.footnotes[ idx ].updateFootnotePosition( nextMinTop ) + 3;
		}
	}

	updateFootnoteColumnHeight( nextMinTop + 8 );
}

function crosslinkFootnoteClicked( ) {
	window.document.location = $( this ).data( 'location' );
}

function defFootnoteClicked( ) {
	forceOpenNewWindowEvenInStandalone( $( this ).data( 'location' ) );
}

function getFootnoteReferenceElements( content ) {
	return content.find( 'span.sup' );
}
function getFootnotes( content ) {
	return content.find( 'p' );
}
function getCrosslinks( content ) {
	return content.find( 'a.crosslink' );
}
function getRegularHyperlinks( content ) {
	// exclude crosslinks and share buttons
	return content.find( '.contentCluster a:not(.crosslink):not(.share-button):not([href^="#"])' );
}

// returns array of [string_with_errors_or_null, map_of_footnotes]
Collection.prototype.parseFootnotes = function( content ) {
	var footnoteReferenceElements = getFootnoteReferenceElements( content );
	var footnoteReferencesMap = [];
	var errors = null;

	footnoteReferenceElements.each( function( ) {
		var footnoteIdText = $( this ).text( );
		if ( footnoteIdText.length > 3) {
			errors = "Suspicious span.sup = '" + footnoteIdText + "' - span.sup should only contain references to footnotes";
			return false;
		}
		var footnoteId = parseInt( footnoteIdText );
		if ( footnoteId <= 0 ) {
			errors = "Non-numeric footnote reference '" + footnoteIdText + "'";
			return false;
		}
		if ( footnoteId in footnoteReferencesMap ) {
			errors = "Multiple references to footnote " + footnoteId;
			return false;
		}
		footnoteReferencesMap[ footnoteId ] = $( this );
	} );
	return [errors, footnoteReferencesMap];
}

// returns array [error_or_null, footnoteId, firstDot, footnoteReference]
function getReferenceForContent( contentEl, footnoteReferencesMap ) {
	var ret = [null, null, null, null];
	var content = contentEl.html( );
	var firstDot = content.indexOf( '.' );
	if ( firstDot < 0 || firstDot > 3 ) {
		ret[0] = "Can't find footnote id in '" + content + "'. Footnotes should start with a number, followed by a dot and their content, e.g. '1. Some extra info'";
		return ret;
	}
	var footnoteIdString = content.substring( 0, firstDot );
	var footnoteId = parseInt( footnoteIdString );
	if ( footnoteId <= 0 ) {
		ret[0] = "Can't find a numeric footnote id in '" + content + "'";
		return ret;
	}
	var footnoteReference = footnoteReferencesMap[ footnoteId ];
	if (typeof footnoteReference === 'undefined') {
		ret[0] = "Footnote '" + content + "' not used";
		return ret;
	}
	ret[1] = footnoteId;
	ret[2] = firstDot;
	ret[3] = footnoteReference;
	return ret;
}

function getArticleIdFromCrosslink( crosslinkReferenceElement ) {
	return crosslinkReferenceElement.attr( 'articleId' );
}

Collection.prototype.validateCrosslinks = function( content ) {
	var error = null;
	getCrosslinks( content ).each( function() {
		if (typeof (getArticleIdFromCrosslink( $( this ) ) ) === "undefined" ) {
			error = 'Crosslink without articleId';
			return false;
		}
	} );
	return error;
}
Collection.prototype.validate = function( footnotes, footnotesReferences ) {
	var remainingFootnotes = [];
	$.each( footnotesReferences, function( idx, element ) {
		if ( typeof element === 'undefined') {
			return;
		}
		remainingFootnotes.push( idx );
	} );
	var error = null;
	getFootnotes( footnotes ).each( function ( ) {
		var referenceLookupResults = getReferenceForContent( $(this), footnotesReferences );
		if ( referenceLookupResults[0] !== null ) {
			error = referenceLookupResults[0];
			return false;
		}
		var idx = remainingFootnotes.indexOf( referenceLookupResults[1] );
		if ( idx >= 0 ) {
			remainingFootnotes.splice( idx, 1 );
		} else {
			error = "Footnote " + referenceLookupResults[1] + " defined multiple times";
			return false;
		}
	} );
	if ( error === null && remainingFootnotes.length > 0 ) {
		error = "Missing footnote(s) for the following reference(s): " + remainingFootnotes;
	}
	return error;
};

Collection.prototype.init = function( content, footnoteColumn ) {
	var footnoteCollection = this;

	function footnoteByReferencePositionCmp( f1, f2 ) {
		var p1 = f1.referencePosition;
		var p2 = f2.referencePosition;
		if ( p1.top === p2.top ) {
			return p1.left - p2.left;
		}
		return p1.top - p2.top;
	}
	function decorateLinksInHtmlWithoutAHrefs( html ) {
		if ( typeof html === 'undefined' || html === "" ) {
			return html;
		}
		return html.replace(
								/((http|ftp|https):\/\/([\w\-_]+(\.[\w\-_]+)+)\/([\w\-\.,@?^=%&amp;:\/~\+#]*[\w\-\@?^=%&amp;\/~\+#])?)/ig,
								"<a target=_blank href='$1'>$3</a>" );
	}
	function decorateLinks( html ) {
		if ( typeof html === 'undefined' || html === "" ) {
			return html;
		}
		//html might have links already in a hrefs, as well as raw links
		//we want to wrap only the raw links
		//let's find a-hrefs with a regex, and then convert raw links in between a-href links

		var ret = "";

		var remainder = html;
		var match;
		while ( ( match = /<a[^>]+href[^>]+>[^<]+<\/a>/ig.exec( remainder ) ) != null ) {
			if ( match.index > 0 ) {
				ret += decorateLinksInHtmlWithoutAHrefs( remainder.substring( 0, match.index ) );
			}
			ret += match[0];
			remainder = remainder.substring( match.index + match[0].length );
		}
		if ( remainder.length > 0 ) {
			ret += decorateLinksInHtmlWithoutAHrefs( remainder );
		}
		return ret;
	}
	function decorateDefinition( html, term ) {
		var idx = html.toLowerCase().indexOf( term.toLowerCase() );
		if (idx < 0) {
			return html;
		}
		return html.substring( 0, idx )
			+ '<span class=term>' + html.substring( idx, idx + term.length ) + '</span>'
			+ html.substring( idx + term.length );
	}
	function shortenSnippet( snippet ) {
		if (typeof(snippet) !== 'string') {
			return "";
		}
		// if 'short', take it all
		if (snippet.length < 200) {
			return snippet;
		}
		// a bit optimistic with split on ". ", but should be 'good enough' for just a snippet
		var sentences = snippet.split('. ');
		// take 2 sentences (if there are that many)
		var sentencesToTake = Math.min(2, sentences.length);
		var snippet = sentences.slice(0, sentencesToTake).join('. ');
		if (snippet[snippet.length-1] != '.' && snippet.indexOf("</p>", snippet.length - 4) === -1)
		{
			snippet += ".";
		}
		snippet += " [&hellip;]";
		return snippet;
	}

	var crosslinksExtraInfo = $('#crosslinksInfo');

	// Step 0: handle "asgreenbox" aka extra info
	// which moves a whole chapter (cluster) inline next to a asgreenbox link
	// and shows it upon a click. It's here as we want to add gradient to the extra info
	{
		function onExtraInfoClicked(extraInfoEl, toggleEl) {
			extraInfoEl.toggle();
			if (extraInfoEl.is(':visible')) {
				toggleEl.html('&#x2944;');
			} else {
				toggleEl.html('&#x2942;');
			}
			footnoteCollection.updatePositions( true );
		}
		$('a[href^="#cluster-"].asgreenbox').each(function(idx, e) {
			e = $(e);
			var aEl = e;
			var ep = e.parent();
			// in case our <A> is directly embedded in an <EM>, we should append our code after EM
			if (("em" === ep[0].tagName.toLowerCase()) && (ep.html() == e[0].outerHTML)) {
				e = $(ep[0]);
			}
			var target = $(aEl.attr('href'));
			var toggleIcon = $('<span class="inlineExtraInfoControlToggle">&#x2942;</span>');
			var newElement = $('<span class="inlineExtraInfo">' + target.find('p').html() + '</span>');
			e.after(newElement);
			e.after(toggleIcon);
			aEl.data('el', newElement);
			aEl.data('controlEl', toggleIcon);
			toggleIcon.data('el', newElement);
			target.remove();
			aEl.attr('href', '');
		}).click(function(event) {
			event.preventDefault();
			var e = $(event.target);
			onExtraInfoClicked(e.data('el'), e.data('controlEl'));
			return false;
		});
		$('.inlineExtraInfoControlToggle').click(function(event) {
			event.preventDefault();
			var e = $(event.target);
			onExtraInfoClicked(e.data('el'), e);
			return false;
		});
	}

	// Step 1: colour text before footnotes/crosslinks.
	// As prep, we have to remove dead crosslinks, so we wouldn't colour them unnecessarily
	// (it's also handy for the crosslinks processing later on).
	// We have to do colouring be before picking up any reference elements,
	// as colouring recreates html elements, so any references
	// acquired before call to this (e.g. <span class="sup">)
	// are by this call invalidated
	getCrosslinks( content ).each( function( ) {
		var crosslinkReferenceElement = $( this );
		var articleId = getArticleIdFromCrosslink( crosslinkReferenceElement );
		if (crosslinksExtraInfo.find('div[toarticle=' + articleId + ']').length === 0) {
			// No extra info for the crosslink. Either it's broken, or it points to a not published article.
			// Ignore, and remove the link from the text.
			crosslinkReferenceElement.replaceWith(crosslinkReferenceElement.html());
		}
	} );
	colourTextBeforeFootnoteReferences( content );

	// CROSSLINKS
	getCrosslinks( content ).each( function( ) {
		var crosslinkReferenceElement = $( this );
		var articleId = getArticleIdFromCrosslink( crosslinkReferenceElement );
		var chapterId = crosslinkReferenceElement.attr('chapterid');
		if ( typeof articleId === 'undefined' ) {
			alert( 'crosslink without articleId' );
			return false;
		}
		var crosslinkExtraInfo = crosslinksExtraInfo.find('div[toarticle=' + articleId + ']');
		// crosslinkExtraInfo.length > 0 as we checked that before colouring

		var href = crosslinkExtraInfo.attr('toarticleurl');
		if (chapterId >= 0) {
			href += '#x' + chapterId;
		}
		var crosslinkExtraInfoElement = crosslinkExtraInfo.find('.abstract');
		crosslinkExtraInfoElement.find('div.imageGallery').remove();
		crosslinkExtraInfoElement.find('figure').remove();
		crosslinkExtraInfoElement.find('figcaption').remove();
		crosslinkExtraInfoElement.find('span.sup').remove();
		var snippet = shortenSnippet(crosslinkExtraInfoElement.html());
		var title = crosslinkExtraInfo.find('.title').html();
		var refopen = crosslinkExtraInfo.find('.refopen').html();
		crosslinkReferenceElement.attr( 'href', href );
		var crosslinkFootnote = $( '<span class=crosslinkFootnote></span>' )
			.appendTo( footnoteColumn )
			.data( 'location', href )
			.append( '<div class=refopen>' + refopen + '</div>' )
			.append( '<div class=articleName>' + title + '</div>' )
			.append( '<div class=snippet>' + snippet + '</div>' )
			.click( crosslinkFootnoteClicked );
		footnoteCollection.footnotes.push( new Footnote( crosslinkReferenceElement, crosslinkFootnote, false ) );
	} );
	crosslinksExtraInfo.remove();


	// FOOTNOTES
	var parseFootnotesResult = this.parseFootnotes( content );
	if ( parseFootnotesResult[0] !== null) {
		alert(parseFootnotesResult[0]);
		return;
	}
	var footnoteReferencesMap = parseFootnotesResult[1];

	var footnoteoutput = $( '<div>' ).addClass( 'footnotes' );
	var hasAnyFootntoes = false;
	getFootnotes( content.find( '#rawFootnotes' ) ).each( function ( idx ) {
		var $element = $( this );
		var rewrappedElement = $( '<span class=footnote>' + $element.html( ) + '</span>' );
		$element.remove();
		$element = rewrappedElement;
		$element.appendTo( footnoteColumn );
		$element.find( 'a' ).attr( 'target', '_blank' );


		var content = $element.html( );
		var footnoteReferenceResults = getReferenceForContent( $element, footnoteReferencesMap );
		if ( footnoteReferenceResults[0] !== null ) {
			alert( footnoteReferenceResults[0] );
			return false;
		}

		var footnoteId = footnoteReferenceResults[1];
		var firstDot = footnoteReferenceResults[2];
		var footnoteReference = footnoteReferenceResults[3];

		var footnoteContent = decorateLinks( content.substring( firstDot + 1 ) );
		$element
			.empty( )
			.append(
				$('<div class="footnoteContentWrapper">')
					.append( '<span class=footnoteId>' + footnoteId + '.</span>' )
					.append( footnoteContent )
			)
			.append( '<div class="readMoreOfFootnote">Read more&hellip;</div>' );

		footnoteReference.addClass('footnoteId');
		footnoteCollection.footnotes.push( new Footnote( footnoteReference, $element, true ) );

		var footnotePrintdiv = $( '<div>' )
			.addClass( 'footnote' )
			.html( footnoteId + ". " + footnoteContent );
		if ( idx == 0 ) {
			$( '<div>' ).addClass( 'unbreakable' )
						.append( '<h2>Footnotes</h2>' )
						.append( footnotePrintdiv )
						.appendTo( footnoteoutput );
		} else {
			footnotePrintdiv.appendTo( footnoteoutput );
		}
		hasAnyFootntoes = true;
	} );

	// ## ADD FOOTNOTES AT THE BOTTOM OF THE TEXT COLUMN FOR PRINT ################### //
	if (hasAnyFootntoes) {
		footnoteoutput.appendTo( $( '#text' ) );
	}

	// DEFINITIONS
	content.find( '.def' ).each( function ( ) {
		var defReferenceElement = $( this );
		var definition = defReferenceElement.attr( 'cont' );
		var term = defReferenceElement.text( );
		var source = defReferenceElement.attr( 'source' );
		var defFootnote = $( '<span class=defFootnote></span>' )
			.appendTo( footnoteColumn )
			.append( $( '<div class=source>' + simplifyRawUrl( source ) + '</div>' ) )
			.append( '<div class=definition>' + decorateDefinition( definition, term ) + ' [&hellip;]</div>' )
			.data( 'location', source )
			.click( defFootnoteClicked );
		footnoteCollection.footnotes.push( new Footnote( defReferenceElement, defFootnote, false ) );
	} );

	// FOOTNOTE IMAGES
	content.find( '.footnote-image' ).each( function ( ) {
		var fnImgReferenceElement = $( this );
		var fnImgImage = fnImgReferenceElement.find( 'img' ).detach();
		var fnImgCaption = fnImgImage.attr('alt') || "";

		if (fnImgReferenceElement.parent().html() == '<span class="footnote-image"></span>') {
			fnImgReferenceElement = fnImgReferenceElement.parent();
			var next = fnImgReferenceElement.next();
			if (next.length > 0) {
				fnImgReferenceElement.remove();
				fnImgReferenceElement = next;
			} else {
				var prev = fnImgReferenceElement.prev();
				if (prev.length > 0) {
					fnImgReferenceElement.remove();
					fnImgReferenceElement = prev;
				}
			}
			// else: tough, footnote-image seems to be the only
		}
		var fnImgFootnote = $( '<span class=imgFootnote></span>' )
			.appendTo( footnoteColumn )
			.append( fnImgImage );
		if (fnImgCaption != "") {
			fnImgFootnote.append( '<div class=imgFootnoteCaption>' + fnImgCaption + '</div>' );
		}
		footnoteCollection.footnotes.push( new Footnote( fnImgReferenceElement, fnImgFootnote, false ) );
	} );

	// Regular hyperlinks
	getRegularHyperlinks( content ).each( function ( ) {
		var regularHyperlinkElement = $( this );
		var href = regularHyperlinkElement.attr( 'href' );

		if (typeof(href) === 'undefined') {
			return;
		}

		if ( regularHyperlinkElement.hasClass('nosidebar') ) {
			// special case, hack, manual links to other articles
			return;
		}

		var hyperlinkFootnote = cloneLinkForSidebar( regularHyperlinkElement )
		hyperlinkFootnote.appendTo( footnoteColumn );

		footnoteCollection.footnotes.push( new Footnote( regularHyperlinkElement, hyperlinkFootnote, false ) );
	});

	this.footnotes.sort( footnoteByReferencePositionCmp );

	setTimeout( function( ) {
		// It's important to show _before_ doing updatePositions.
		// Otherwise all elements would be hidden and have no height
		// which would mess up calculations
		// On the other hand, showing and repositioning in one event,
		// should only be drawn once by the browser, so we should have no visual
		// artefacts anyway.
		$( '#footnotes' ).show();
		footnoteCollection.updatePositions( true );
	}, 100 );

	$( '#footnotes a:not(.crosslink)' ).each(simplifyUrlAndMakeItFitInSidebar);
	$( '.footnote' ).click(function() {
		if (!$(this).hasClass('long')) {
			return;
		}
		var wasThisTruncated = $(this).hasClass('truncated');

		// collapse all
		var expandedElements = $('.footnote.long:not(.truncated)');
		expandedElements.addClass('animating');
		expandedElements.find('.readMoreOfFootnote').show();
		expandedElements
			.find('.footnoteContentWrapper')
				.animate({
					height: maxFootnoteContentHeight
				}, {
					progress: function() {
						footnoteCollection.updatePositions( false )
					},
					complete: function() {
						$(this).parents('.long')
							.addClass('truncated')
							.removeClass('animating');
					}
				});

		// expand this element if it was truncated
		if (wasThisTruncated) {
			var that = $(this);
			that.addClass('animating');
			that.find('.readMoreOfFootnote').hide();
			that
				.find('.footnoteContentWrapper')
					.animate({
						height: that.data('naturalHeight')
					},{
						progress: function() {
							footnoteCollection.updatePositions( false )
						},
						complete: function() {
							that.removeClass('truncated animating');
						}
					});
		}
	});
};

Collection.prototype.onWindowResize = function( ) {
	// IE gets confused if the parent of img inside .imgFootnote does not have proper size
	$('#footnotes .imgFootnote').width($( '#footnotes' ).width());

	this.updatePositions( true );
};

return {
	Collection: Collection
};


})();
