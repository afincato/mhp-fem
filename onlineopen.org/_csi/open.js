
function Colour(r,g,b) {
	this.r = r;
	this.g = g;
	this.b = b;
}
Colour.prototype.clone = function() {
	return new Colour(this.r, this.g, this.b);
};
Colour.prototype.getCssText = function() {
	return "rgb(" + Math.round(this.r) + "," + Math.round(this.g) + "," + Math.round(this.b) + ")";
};
Colour.prototype.add = function(other) {
	this.r += other.r;
	this.g += other.g;
	this.b += other.b;
};
Colour.prototype.gradient = function(toColour, percent) {
	return new Colour(
		Math.round(this.r * (1-percent) + toColour.r * percent),
		Math.round(this.g * (1-percent) + toColour.g * percent),
		Math.round(this.b * (1-percent) + toColour.b * percent));
};
Colour.prototype.isNotBlack = function() {
	return this.r !== 0 || this.g !== 0 || this.b !== 0;
};

var TimelineSolidColour = new Colour(31,173,74);
var NeutralTextColour = new Colour(0, 0, 0);
var EventTitleSolidColour = new Colour(177,41,152);
var BlogEntryTitleSolidColour = new Colour(0, 0, 255);

function decodeHtml(txt) {
	return $('<textarea/>').html(txt).val();
}

// dir: 1 means from front to end, -1 means from back to front
function countColourableCharacters(txt, maxCharacterCount, maxLength, dir) {
	var currentIndex = dir === -1 ? txt.length - 1 : 0;
	var acceptedChars = 0;
	var isInTagDefinition = false;
	var isInTag = false;
	while (currentIndex >= 0 && currentIndex < txt.length && acceptedChars < maxCharacterCount) {
		var thisChar = txt[currentIndex];
		switch (thisChar) {
			case '<':
				isInTagDefinition = !isInTagDefinition;
				if (dir === -1) {
					isInTag = !isInTag;
				}
				break;
			case '>':
				isInTagDefinition = !isInTagDefinition;
				if (dir === 1) {
					isInTag = !isInTag;
				}
				break;
			default:
				if (!isInTagDefinition && thisChar !== ' ') {
					++acceptedChars;
				}
		}
		currentIndex += dir;
		if ((dir === -1 && txt.length - currentIndex > maxLength) || (dir === 1 && currentIndex >= maxLength)) {
			break;
		}
	}
	currentIndex -= dir; // undo the last decrement/increment
	return [currentIndex, acceptedChars];
}

function wrapWithGradient(txt, fromColour, toColour, maxCharacterCount, hardLimitOfHtmlCharactersToChange) {
	if (txt.length < 2) {
		return txt;
	}
	hardLimitOfHtmlCharactersToChange = hardLimitOfHtmlCharactersToChange || maxCharacterCount;
	var charsToColour = countColourableCharacters(txt, maxCharacterCount, hardLimitOfHtmlCharactersToChange, -1)[1];
	var currentIndex = txt.length - 1;
	var acceptedChars = 0;
	var isInTagDefinition = false;
	var isInTag = false;
	var ret = '';
	while (currentIndex >= 0) {
		var thisChar = txt[currentIndex];
		switch (thisChar) {
			case '<':
				isInTagDefinition = !isInTagDefinition;
				isInTag = !isInTag;
				break;
			case '>':
				isInTagDefinition = !isInTagDefinition;
				break;
			default:
				if (!isInTagDefinition && thisChar !== ' ') {
					var thisColour = fromColour.gradient(toColour, acceptedChars/charsToColour);
					thisChar = '<span class=ftntgrdnt style="color:' + thisColour.getCssText() + '">' + thisChar + '</span>';
					++acceptedChars;
				}
		}
		ret = thisChar + ret;
		if (acceptedChars == charsToColour) {
			return txt.substring(0, currentIndex) + ret;
		}
		--currentIndex;
	}
	return ret;
}

// https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
var docCookies = {
  getItem: function (sKey) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

function getWindowHeight() {
	// for mobile safari, we have to take window.innerHeight
	// as only that one includes proper information about
	// the magically shrinking address bar
	return window.innerHeight || $(window).height();
}

function simplifyRawUrl( html, element ) {
	if ( typeof html === 'undefined' || html === "")  {
		return html;
	}
	if (html.substring(0, 3) === "../" && typeof(element) !== "undefined") {
		// a link to a resource inside the portal, we trust link's html has the right description
		return element.html();
	}

	html = html.replace(/https?:\/\//, "");
	html = html.replace(/^www\./, "");
	html = html.replace(/((\w+\.)+\w+)\/.+/, '$1');
	// remove the trailing /, but only if that's the only /
	// we don't want to break links such as example.com/stuff/more_stuff/
	if (html.length > 0 && html[html.length-1] === '/' && html.indexOf('/') === html.length - 1) {
		html = html.substring(0, html.length-1);
	}
	// add zero-width spaces after every dot to help with line break
	html = html.replace(/\./g, '.&#8203;');
	return html;
}

function cloneLinkForSidebar( link ) {
	var ret = $( '<div class="hyperlinkFootnote">' );

	link.clone( )
		.appendTo( ret )
		.html( simplifyRawUrl( link.attr( 'href' ), link ) )
		.removeAttr( 'style' )
		.removeAttr( 'class' );

	var extraInfo = link.attr( 'desc' );
	if (typeof(extraInfo) !== "undefined" && extraInfo !== "") {
		ret.append( '<div class=linkExtraInfo>' + extraInfo + '</div>' );
	}

	return ret;
}

function forceOpenNewWindowEvenInStandalone( url ) {
	if (("standalone" in window.navigator) && window.navigator.standalone) {
		var a = $( '<a>' )
			.attr('href', url)
			.attr('target', '_blank');

		var dispatch = document.createEvent("HTMLEvents");
		dispatch.initEvent("click", true, true);
		a[0].dispatchEvent(dispatch);
	} else {
		window.open( url );
	}
}

// ## INIT PAGE ###################################################################### //

// image galleries collection for non-article pages that have aglleries enabled
var imageGalleriesCollection = null;

$( function( ) {
	function onWindowResize() {
		if (imageGalleriesCollection !== null) {
			imageGalleriesCollection.onWindowResize();
		}
	}

	var delay = 0;
	$.fn.translate3d = function(translations, speed, easing, complete) {
		var opt = $.speed(speed, easing, complete);
		opt.easing = opt.easing || 'ease';
		translations = $.extend({x: 0, y: 0, z: 0}, translations);

		return this.each(function() {
			var $this = $(this);

			$this.css({
				transitionDuration: opt.duration + 'ms',
				transitionTimingFunction: opt.easing,
				transform: 'translate3d(' + translations.x + 'px, ' + translations.y + 'px, ' + translations.z + 'px)'
			});

			setTimeout(function() {
				$this.css({
					transitionDuration: '0s',
					transitionTimingFunction: 'ease'
				});

				opt.complete();
			}, opt.duration + (delay || 0));
		});
	};

	// initContentDisplay
	$( '#text' ).css( 'padding-top', $( '#mainmenu' ).outerHeight( ) + 'px' );

	// select the current page in the main menu
	var pathname = window.document.location.pathname;
	var pageName = '';
	var indexOfPhp = pathname.indexOf('.php');
	if (indexOfPhp > 0) {
		pathname = pathname.substr(0, indexOfPhp + 4);
		pageName = pathname.substr(pathname.lastIndexOf('/') + 1);
	}
	$('.menuitem[href^="' + pageName + '"]').addClass('selected');

	// apply colourful gradient to the title(s)
	$( '#text > h1.title, .article h1.title' ).each(function() {
		var txt = decodeHtml($(this).html());
		$(this).html(wrapWithGradient(txt, NeutralTextColour, TimelineSolidColour, txt.length));
	});
	$( '.event > h1.title' ).each(function() {
		var txt = decodeHtml($(this).html());
		$(this).html(wrapWithGradient(txt, NeutralTextColour, EventTitleSolidColour, txt.length));
	});
	$( '.blogEntry > h1.title' ).each(function() {
		var txt = decodeHtml($(this).html());
		$(this).html(wrapWithGradient(txt, NeutralTextColour, BlogEntryTitleSolidColour, txt.length));
	});

	// init image galleries on pages that are not an article
	if (typeof articleid === 'undefined' && typeof ImageGallery !== 'undefined') {
		imageGalleriesCollection = new ImageGallery.Collection( );
		imageGalleriesCollection.init( $('div.imageGallery') );
	}

	$(window).resize(onWindowResize);
	onWindowResize();

/*!
 * jQuery stayInWebApp Plugin
 * version: 0.4 (2012-06-19)
 */
(function($) {
	//extend the jQuery object, adding $.stayInWebApp() as a function
	$.extend({
		stayInWebApp: function(selector) {
			//detect iOS full screen mode
			if(("standalone" in window.navigator) && window.navigator.standalone) {
				//if the selector is empty, default to all links
				if(!selector) {
					selector = 'a';
				}
				//bind to the click event of all specified elements
				$("body").delegate(selector,"click",function(event) {
					//TODO: execute all other events if this element has more bound events
					/* NEEDS TESTING
					for(i = 0; i < $(this).data('events'); i++) {
						console.log($(this).data('events'));
					}
					*/

					//only stay in web app for links that are set to _self (or not set)
					if($(this).attr("target") == undefined || $(this).attr("target") == "" || $(this).attr("target") == "_self") {
						//get the destination of the link clicked
						var dest = $(this).attr("href");

						//if the destination is an absolute url, ignore it
						if(!dest.match(/^http(s?)/g)) {
						  //prevent default behavior (opening safari)
						  event.preventDefault();
						  //update location of the web app
						  self.location = dest;
						}
					}
				});
			}
		} //end stayInWebApp func
	});
})( jQuery );

$.stayInWebApp();

} );
