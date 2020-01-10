var showCase = new ShowCase();

$(function( ) {
	var footnotesCollection = new Footnotes.Collection( );
	var imageGalleriesCollection = new ImageGallery.Collection( );
	var contributionCollection = new ContributionGallery.Collection( );

	$(document).keyup( handelKeyUp );

	// controling right and left key press to navigate through articles or image gallerys
	function handelKeyUp( e ) {
		switch (e.which) {
			case 39: // right
				if ( showCase.isOn ) {
					showCase.gallery.galleries[0].goToNext( -1 );
				} else {
					window.location.href = $('.nextArticle>a').attr('href');
				}
				break;
			case 37: // left
				if ( showCase.isOn ) {
					showCase.gallery.galleries[0].goToNext( +1 );
				} else {
					window.location.href = $('.prevArticle>a').attr('href');
				}
				break;
			case 27:
				if ( showCase.isOn ) {
					showCase.close();
				}
				break;
		}
	}

	// scrolledIntoView jQuery plugin inspired by http://www.benknowscode.com/2013/07/detect-dom-element-scrolled-with-jquery.html
	var pluginName = 'scrolledIntoView',
		settings = {
			scrolledin: null,
			scrolledout: null
		},
		_watch = [],
		$window = $(window);
	function monitor( element, options ) {
		var item = { element: element, options: options, invp: false };
		_watch.push(item);
		return item;
	}
	$.fn[pluginName] = function( options ) {
		var options = $.extend({}, settings, options);
		this.each( function () {
			var $el = $(this),
				instance = $.data( this, pluginName );

			if ( instance ) {
				instance.options = options;
			} else {
				$.data( this, pluginName, monitor( $el, options ) );
			}
		});
		return this;
	}
	function test($el) {
		var docViewTop = $window.scrollTop(),
			docViewBottom = docViewTop + $window.height(),
			elemTop = $el.offset().top,
			elemBottom = elemTop + $el.height();

		return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
				 && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) );
	}
	function checkInView( e ) {
		$.each(_watch, function () {
			if ( test( this.element ) ) {
				if ( !this.invp ) {
					this.invp = true;
					if ( this.options.scrolledin ) this.options.scrolledin.call( this.element, e );
					this.element.trigger( 'scrolledin', e );
				}
			} else if ( this.invp ) {
				this.invp = false;
				if ( this.options.scrolledout ) this.options.scrolledout.call( this.element, e );
				this.element.trigger( 'scrolledout', e );
			}
		});
	}

	var _buffer = 0;

	$( window ).on( 'scroll', function ( e ) {
		if ( _watch.length === 0 ) {
			return;
		}
		if ( _buffer > 0 ) {
			clearTimeout( _buffer );
		}
		_buffer = setTimeout( function( ) {
			checkInView( e );
			_buffer = 0;
		}, 300 );
	} );

	var videoframes = $( "#text iframe[src*='player.vimeo.com']" );

	function storeVideoAspectRatio( ) {

		$( this ).data( 'aspectRatio', this.height / this.width )

				 // and remove the hard coded width/height
				 .removeAttr('height')
				 .removeAttr('width');
	}
	function updateVideoSize( ) {

		var textwidth = $( '#text' ).width( );

		// Resize all videos according to their own aspect ratio
		videoframes.each( function( ) {

			var videoframe = $( this );
			videoframe.width( textwidth )
					  .height( textwidth * videoframe.data( 'aspectRatio' ) );
		} );
	}
	function playVideo( ) {
		$( this ).vimeo( 'setVolume', '0.0' )
				 .vimeo( 'play' );
	}
	function pauseVideo( ) {
		$( this ).vimeo( 'pause' );
	}

	videoframes
		.each( storeVideoAspectRatio )
		.load( function( ) {
			// only trigger auto-play if there is one video in the article,
			// otherwise it's a confusing chaos
			if (videoframes.length === 1) {
				$( this )
					.scrolledIntoView( )
					.on( 'scrolledin', playVideo )
					.on( 'scrolledout', pauseVideo );
				$( window ).trigger( 'scroll' );
			}
		} );

	// ## SCALE VIDEOS PROPORTIONALLY ON LOAD AND RESIZE ############################## //
	$( window ).resize( updateVideoSize );
	updateVideoSize( );

	function resizeWindow( ) {
		resizeOverlayWrappers();

		imageGalleriesCollection.onWindowResize( );
		contributionCollection.onWindowResize( );
		if( showCase.isOn ) {
			showCase.updateSize();
		}

		// footnotes last to make sure they can rely on positioning of all the other items
		footnotesCollection.onWindowResize( );
	}

	// ## INITIALIZE ARTICLE ########################################################## //

	// get and set the word count
	(function() {
		function getWordCount( words ) {
			words = words.replace( '&nbsp;', ' ');
			return !words ? 0 : (words.split(/^\s+$/).length === 2 ? 0 : 2 +
				words.split(/\s+/).length - words.split(/^\s+/).length - words.split(/\s+$/).length);
		}
		function padWithLeadingZeros( txt, l ) {
			while (txt.length < l) {
				txt = '0' + txt;
			}
			return txt;
		}

		var allClusters = $( 'div[id^=cluster-]' );

		var wordcount = getWordCount(allClusters.text());

		// ## SUBSTRACT AMOUNT OF FOOTNOTE REFERALS
		wordcount -= allClusters.find('.sup').length;

		// subtract the share bar words
		wordcount -= getWordCount($('.shareBar').text());

		var wordstring = String( wordcount );

		// ## ADD THOUSANDS SEPARATOR TO THE WORDCOUNT TEXT OUTPUT
		if (wordcount >= 1000) {
			wordstring = Math.floor( wordcount / 1000 ) + '.' + padWithLeadingZeros(String(wordcount % 1000), 3);
		}

		// ## SET OUTPUT DIV TEXT
		$( '<span>' )
			.addClass( 'wordcount' )
			.data( 'amount', wordcount )
			.text( wordstring + ' words' )
			.appendTo( $( '#articleExtraInfo' ) );
	}());

	// ## ACTIVATE SHARE BUTTONS AND OVERRIDE DEFAULT LINKS PAGE ########################## //
	(function() {
		function createMailto( ) {
			var subject = "Online Open! - " + $( 'meta[itemprop=name]' ).attr( 'content' ).trim( );

			var linkurl = this.location.href;
			linkurl = linkurl.split( '#' ).join( '' );

			var body =
				'Hi there,\n\n' +
				'I’ve just spotted this interesting article on Open!, which I want to share with you.\n\n' +
				linkurl + '\n\n' +
				'Stay up-to-date on Open!’s latest publications via: http://www.onlineopen.org/subscribe.php\n';

			return 'mailto:?subject=' + subject + '&body=' + encodeURIComponent(body);
		}

		function openDownloadPDF( e ) {
			e.preventDefault( );

			var wordcount = $( '.wordcount' ).data( 'amount' );
			window.open( $( this ).attr( 'href' ) + '&wordcount=' + wordcount );
		}

		function createShareButtonHandler( popupWindowHeight ) {
			return function ( event ) {

				event.preventDefault( );

				var popupWindowWidth = 500;
				var left = (screen.availWidth - popupWindowWidth) / 2;
				var top = (screen.availHeight - popupWindowHeight) / 3;

				var windowprops =
					'address=0, toolbar=0, location=0, menubar=0, status=0'
					+ ', left=' + left + ', top=' + top
					+ ', width=' + popupWindowWidth + ', height=' + popupWindowHeight;

				var popup = window.open( $( this ).attr( 'href' ), 'share', windowprops );

				popup.focus( );
			};
		}

		$( '.share-button.email' )
			.attr( 'href', createMailto( ) );

		$( '.share-button.print' )
			.click( function (event) {
				event.preventDefault( );

				window.print( );
			});

		$( '.share-button.twitter' ).click( createShareButtonHandler( 444 ) );
		$( '.share-button.facebook' ).click( createShareButtonHandler( 300 ) );
		$( '.share-button.download' ).click( openDownloadPDF );
	}());

	function resizeOverlayWrappers() {
		$('#text .textOverlayWrapper')
			.each(function(wrapperIdx, wrapperEl)
			{
				var height = 0;
				var overlay1 = $(wrapperEl).find('.textOverlay:visible')
					.each(function(overlayIdx, overlayEl)
					{
						height = Math.max(height, $(overlayEl).height());
					});
				$(wrapperEl).height(height);
			});
	}
	function overlayEnableStateChanged() {
		var thisToggle = $(this);
		var thisOverlayIndex = thisToggle.hasClass('overlayEnable_1') ? 1 : 2;
		var otherOverlayIndex = thisOverlayIndex === 1 ? 2 : 1;
		var otherToggle = $('#text .overlayEnable_' + otherOverlayIndex)
		var thisWasSelected = thisToggle.hasClass('selected');
		var otherIsSelected = otherToggle.hasClass('selected');

		if (!otherIsSelected && thisWasSelected) {
			// we should make sure there will be at least one overlay enabled
			// so since we're disabling this one, and the other one is already disabled
			// we'll enable the other one
			otherToggle.addClass('selected');
			$('#text .textOverlay_' + otherOverlayIndex).show();
		}

		thisToggle.toggleClass('selected');
		$('#text .textOverlay_' + thisOverlayIndex).toggle(!thisWasSelected);

		resizeWindow()
	}
	function smoothScrollToElement(element) {
		var newOffset = element.offset().top - $('#mainmenu').height() + 20;
		$('html, body').stop().animate({
			'scrollTop': newOffset
		}, 'slow');
	}

	// ## Articles with overlays
	if (articleOverlays > 0) {
		(function() {
			function annotateForOverlaying(el, index) {
				if (el === null) {
					return;
				}
				el
					.addClass('textOverlay')
					.addClass('textOverlay_' + index);
			}
			function mergeForOverlaying(el1, el2) {
				var wrapper = $('<div>').addClass('textOverlayWrapper');
				var height = 0;
				if (el1 !== null) {
					height = Math.max(el1.height(), height);
					el1.detach();
					wrapper.append(el1);
					annotateForOverlaying(el1, 1);
				}
				if (el2 !== null) {
					height = Math.max(el2.height(), height);
					el2.detach();
					wrapper.append(el2);
					annotateForOverlaying(el2, 2);
				}
				return wrapper.height(height);
			}
			function appendAsOverlay(target, newOverlay) {
				var newCluster = $('<div>')
					.addClass('contentCluster')
					.attr('id', target.attr('id'));
				newCluster.insertBefore(target);

				var title1 = target.find('h2');
				var title2 = newOverlay.find('h2');
				if (title1.length > 0 || title2.length > 0) {
					var titles = mergeForOverlaying(
						title1.length > 0 ? $(title1[0]) : null,
						title2.length > 0 ? $(title2[0]) : null
					);
					newCluster.append(titles);
				}
				var elements1 = target.find('p,div:not(.unbreakable),ul,ol');
				var elements2 = newOverlay.find('p,div:not(.unbreakable),ul,ol');
				var count = Math.max(elements1.length, elements2.length);
				for (var i = 0; i < count; ++i) {
					var newEl = mergeForOverlaying(
						i < elements1.length ? $(elements1[i]) : null,
						i < elements2.length ? $(elements2[i]) : null
					);
					newCluster.append(newEl);
				}

				target.remove();
				newOverlay.remove();
			}

			var previousChapter = null;
			$('.contentCluster[chapterpermaid]').each(function(idx, elem) {
				var title = $(elem).find('h2');
				if (title.length > 0) {
					if (title.html().toUpperCase().indexOf('[NO OVERLAY]') >= 0) {
						title.html(title.html().replace('[NO OVERLAY]', '').trim());
						if (title.html().length === 0) {
							title.remove();
						}
						return;
					}
				}
				if (previousChapter == null) {
					previousChapter = elem;
				} else {
					appendAsOverlay($(previousChapter), $(elem));
					previousChapter = null;
				}
			});

			$('#text .overlayEnable_1, #text .overlayEnable_2')
				.addClass('selected')
				.click(overlayEnableStateChanged);
		}());
	}

	footnotesCollection.init( $( '#text' ), $( '#footnotes div' ) );

	if ( fullscreenGallery ) {
		contributionCollection.init( $( 'div.imageGallery' ) );
	}
	else {
		imageGalleriesCollection.init( $( 'div.imageGallery' ) );
	}

	$( window ).resize( resizeWindow );
	resizeWindow( );

	// wait for the document and all the resources to load (images, fonts) and the
	// trigger resize, so that we would reposition content size dependent elements
	$( window ).load( resizeWindow );

	// note handling greenboxes is in footnotes.js
	$('a[href^="#"]:not(.asgreenbox)').click(function(e) {
		e.preventDefault();
		smoothScrollToElement($(this.hash));
		return false;
	});

	// If we have a hash starting with an x (#x...), it means we're dealing with
	// a crosslink. We could let the browser scroll to the anchor automatically,
	// but it won't take into consideration the top menu. Let's control it manually, then.
	{
		var scrollToTarget = null;
		var windowHash = window.location.hash;
		if (/^#cluster/.test(windowHash)) {
			scrollToTarget = $(windowHash);
		} else if (/^#x/.test(windowHash)) {
			var permaid = windowHash.substring(2);	//skip "#x" from the beginning
			scrollToTarget = $('div[id^=cluster][chapterpermaid="' + permaid + '"]');
		}
		if (scrollToTarget != null && scrollToTarget.length > 0) {
			// initiate the scroll right away
			smoothScrollToElement(scrollToTarget);
			// but also refine it wonce the page loads, as the offset might have changed
			$(window).load(function() {
				smoothScrollToElement(scrollToTarget);
			});
		}
	}
} );
