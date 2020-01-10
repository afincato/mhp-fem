var ImageGallery = (function( ) {
	"use strict";

	var maximumImageHeight = 400;
	var hasTouch = 'ontouchstart' in window,
		resizeEv = 'onorientationchange' in window ? 'orientationchange' : 'resize',
		startEv = hasTouch ? 'touchstart' : 'mousedown',
		moveEv = hasTouch ? 'touchmove' : 'mousemove',
		endEv = hasTouch ? 'touchend' : 'mouseup',
		cancelEv = hasTouch ? 'touchcancel' : 'mouseup';
	var contentResizeHandler = null;

	function getPageX( e ) {
		return (hasTouch ? e.originalEvent.touches[0] : e).pageX;
	}

	function Gallery( galleryDiv ) {
		this.galleryDiv = galleryDiv;

		if (this.galleryDiv.hasClass('oneRandomImageGallery')) {
			let allFigures = this.galleryDiv.find('figure');
			let figureCount = allFigures.length;
			let figureToStay = Math.round(Math.random() * (figureCount-1));
			this.galleryDiv.find('figure:not(:nth-child(' + (figureToStay+1) + '))').remove();
			this.galleryDiv.removeClass('oneRandomImageGallery'); // show
		}

		this.galleryDivStrip = $( '<div class="galleryStrip"></div>' );
		this.galleryDivStrip.appendTo( this.galleryDiv );
		this.naturalImageSize = galleryDiv.hasClass('naturalImageSize');
		this.draggableInited = false;

		var gallery = this;
		var allFigures = galleryDiv.find('figure');
		allFigures.find('img').css('marginTop', '');
		this.itemCount = allFigures.length;
		this.imageCounter = null;
		this.currentItemIdx = 0;

		if (this.naturalImageSize && this.itemCount > 1) {
			alert('Gallery with naturalImageSize but more than 1 item requested');
		}

		if (this.naturalImageSize) {
			this.galleryDiv.find('img').wrap('<div class="imgInnerWrapper">');
		}

		// show image full screen link in figcaption
		this.galleryDiv.find('a.showImageShowCase')
			.click(function (e) {
				showCase.open(e);
			});

		if (this.itemCount == 1) {
			var imageLinks = allFigures.find('a.imageLink');
			if (imageLinks.length >= 0) {
				// There is a link in the gallery marked as imageLink.
				// We will wrap the actual image in an <a> element
				var newAElement = $('<a></a>')
					.attr('href', imageLinks.attr('href'))
					.addClass('imageLinkWrapper');
				allFigures.find('img').wrap(newAElement);
			}
			return;
		}
		if (this.itemCount <= 1) {
			return;
		}

		// support for multi-images galleries
		this.galleryDiv.addClass('withImageCounter');
		this.imageCounter = $( '<span class="imageCounter">' );
		this.imageCounter.appendTo( this.galleryDiv );
		this.updateImageCounter( );

		allFigures.each(function(idx) {
			var thisFigure = $(this).detach();
			gallery.galleryDivStrip.append( thisFigure );
			thisFigure
					.addClass( thisFigure.find('img').attr('class') )
		});

		this.galleryDivStrip.css('cursor', 'pointer');

		this.moveStart = 0;
		this.isAnimating = false;
		this.lastMovePosition = 0;
		this.currentTranslateX = 0;
		this.currentGestureTotalTranslateX = 0;
		this.itemWidth = 0;

		var moveStartFn = function( e ) {

			if ( !hasTouch ) {
				e.preventDefault();
			}
			if ( gallery.isAnimating ) {
				return;
			}
			gallery.moveStart = new Date().getTime();
			gallery.currentGestureTotalTranslateX = 0;
			gallery.lastMovePosition = getPageX( e );
		};
		var moveFn = function( e ) {
			if ( (gallery.moveStart === 0) || (galleryTransitionEffect === 'fade')) {
				return;
			}
			var newPosition = getPageX( e );
			gallery.updateTranslate( newPosition - gallery.lastMovePosition );
			gallery.lastMovePosition = newPosition;
			e.preventDefault(); // acoid scrolling up and down whilst we're scrolling the gallery
		};
		var moveEndFn = function( e, targetId ) {
			// remember that on touch device e doesn't have touches, so no coordinates there

			//if close btn in showcase clicked
			//or
			// there was no move
			if ( $( e.target ).hasClass( 'showcase-close' )
			 || gallery.moveStart === 0 ) {
				return;
			}

			gallery.isMoving = false;
			var itemWidth = gallery.getItemWidth( );
			var now = new Date().getTime();

			if ( e.target.tagName.toLowerCase() === "a" ) {
				gallery.animateTranslate( -gallery.currentGestureTotalTranslateX );
				gallery.moveStart = 0;
			}
			else if ( now - gallery.moveStart < 150 ) {
				// click
				var dir = ( gallery.lastMovePosition > gallery.galleryDiv.offset().left + gallery.galleryDiv.width() / 2 ) ? -1 : 1;
				gallery.goToNext( dir );
				return;
			}
			else {
				var desiredAnimationOffset = 0;
				var isFastMove = now - gallery.moveStart < 300;
				if ( gallery.currentGestureTotalTranslateX > itemWidth / 4 || (isFastMove && gallery.currentGestureTotalTranslateX > 0) ) {
					desiredAnimationOffset = itemWidth - Math.min( itemWidth, gallery.currentGestureTotalTranslateX );
				}
				else if ( gallery.currentGestureTotalTranslateX < -itemWidth / 4 || (isFastMove && gallery.currentGestureTotalTranslateX < 0)) {
					desiredAnimationOffset = -( itemWidth - Math.min( itemWidth, Math.abs( gallery.currentGestureTotalTranslateX ) ) );
				}
				else {
					desiredAnimationOffset = -gallery.currentGestureTotalTranslateX;
				}
				gallery.animateTranslate( desiredAnimationOffset );
			}

			gallery.moveStart = 0;
		};

		this.galleryDiv.on( startEv, moveStartFn );
		this.galleryDiv.on( moveEv, moveFn );
		$( document ).on( endEv, moveEndFn );
		$( document ).on( cancelEv, moveEndFn );
	}

	var FadeTransitionDuration = 1000;

	Gallery.prototype.goToNext = function( dir ) {
		var gallery = this;

		if ( gallery.isAnimating ) {
			return false;
		}

		var currentItemIdx = gallery.currentItemIdx;
		var nextItemIdx = currentItemIdx - dir;
		if (nextItemIdx < 0) {
			nextItemIdx = gallery.itemCount - 1;
		} else if (nextItemIdx >= gallery.itemCount) {
			nextItemIdx = 0;
		}
		gallery.currentItemIdx = nextItemIdx;

		if (galleryTransitionEffect === 'fade') {
			var allFigures = gallery.galleryDivStrip.find('figure');
			var currentElement = allFigures[currentItemIdx];
			var nextElement = allFigures[nextItemIdx];

			gallery.isAnimating = true;
			gallery.moveStart = 0;
			$(currentElement).css('z-index', 1).animate({'opacity': 0}, {duration: FadeTransitionDuration});
			$(nextElement)
				.css({left: 0, opacity: 0, position: 'absolute', zIndex: 10})
				.animate({opacity: 1}, {
					duration: FadeTransitionDuration,
					complete: function() {
						gallery.isAnimating = false;
						gallery.updateImageCounter(nextItemIdx + 1);
					}
				});
		}
		else
		{
			// default to scroll

			var itemWidth = gallery.getItemWidth( );
			var desiredAnimationOffset = 0;

			desiredAnimationOffset = -gallery.currentGestureTotalTranslateX + dir * itemWidth;
			var maxTranslation = itemWidth * ( gallery.itemCount - 1);

			if ( gallery.currentTranslateX + desiredAnimationOffset < -maxTranslation ) {
				desiredAnimationOffset = -gallery.currentTranslateX;
			}
			else if ( gallery.currentTranslateX == 0 && dir == 1 ){
				desiredAnimationOffset = -maxTranslation;
			}

			gallery.animateTranslate( desiredAnimationOffset );
			gallery.moveStart = 0;
		}
	};

	Gallery.prototype.getItemWidth = function( ) {
		return this.itemWidth;
	};

	Gallery.prototype.goTo = function (index) {
		this.currentItemIdx = index;
		if (galleryTransitionEffect === 'fade') {
			var allFigures = this.galleryDivStrip.find('figure');
			allFigures.css({
				'z-index': 1,
				'position': 'absolute',
				'left': 0,
				'opacity': 0
			});
			$(allFigures[index]).css({
				'z-index': 10,
				'opacity': 1
			});
		} else {
			this.currentTranslateX = -index * this.itemWidth;
			this.galleryDivStrip.css('margin-left', this.currentTranslateX + 'px');
		}
	};

	Gallery.prototype.animateTranslate = function( dx ) {
		var gallery = this;
		this.isAnimating = true;
		this.galleryDivStrip.animate(
			{
				'margin-left': ( gallery.currentTranslateX + dx ) + 'px'
			}, function () {
					gallery.currentTranslateX += dx;
					gallery.isAnimating = false;

					var imageIndex = Math.round( 1 - gallery.currentTranslateX / gallery.getItemWidth( ) );
					gallery.updateImageCounter( imageIndex );
			}
		);
	};

	Gallery.prototype.updateTranslate = function( dx ) {
		if (galleryTransitionEffect === 'fade') {
			return;
		}
		var prevTranslate = this.currentTranslateX;
		this.currentTranslateX += dx;
		if ( this.currentTranslateX > 0 ) {
			this.currentTranslateX = 0;
		}
		var maxVal = this.getItemWidth( ) * ( this.itemCount - 1);
		if ( this.currentTranslateX < -maxVal ) {
			this.currentTranslateX = -maxVal;
		}
		this.currentGestureTotalTranslateX += this.currentTranslateX - prevTranslate;
		this.galleryDivStrip.css( 'margin-left', this.currentTranslateX + 'px' );
	};

	function onImgDragged() {
		$(this).data('was_dragged', true);
	}

	Gallery.prototype.updateItemWidth = function (newitemwidth, extraMarginForImgLeftRight) {
		var gallery = this;
		var isContribution = this.galleryDiv.hasClass( 'showcase' );

		var oldslidewidth = $( 'figure' ).width( );

		this.itemWidth = newitemwidth;
		if (this.naturalImageSize) {
			var pixelRatio = 2; // we assume people upload always double (retina) resultions images into the gallery
			var img = this.galleryDiv.find('img');

			var origOrigWidth = img.attr('origWidth');
			var origOrigHeight = img.attr('origHeight');
			var origWidth = origOrigWidth / pixelRatio;
			var origHeight = origOrigHeight / pixelRatio;
			var viewportWidth = newitemwidth;
			var viewportHeight = newitemwidth / 3 * 2;
			if (viewportWidth > origWidth) {
				origHeight = (viewportWidth / origWidth) * origHeight;
				origWidth = viewportWidth;
			}
			if (viewportHeight > origHeight) {
				origWidth = (viewportHeight / origHeight) * origWidth;
				origWidth = viewportHeight;
			}

			this.galleryDiv
				.find('.imgWrapper')
					.width( viewportWidth )
					.height( viewportHeight );
			this.galleryDiv
				.find('.imgInnerWrapper')
					.width( 2 * origWidth - viewportWidth )
					.height( 2 * origHeight - viewportHeight )
					.css('left', - (origWidth - viewportWidth) )
					.css('top',  - (origHeight - viewportHeight) );
			img.height(origHeight)
					.width(origWidth);

			if (img.data('was_dragged') === true) {
				// image has been dragged. Just make sure it doesn't get weirdly off the viewport
				var imgLeft = Number.parseInt(img.css('left'));
				if (imgLeft > origWidth - viewportWidth) {
					img.css('left', origWidth - viewportWidth);
				}
				var imgTop = Number.parseInt(img.css('right'));
				if (imgTop > origHeight - viewportHeight) {
					img.css('top', origHeight - viewportHeight);
				}
			} else {
				// image has not been dragged yet. Make sure the preferred center stays visible
				// calculate the desired offset. Calculate the desired left-top corner
				var desiredViewingCenterX = (img.attr('desiredcenterx') / origOrigWidth ) || 0.5;
				var desiredViewingCenterY = (img.attr('desiredcentery') / origOrigHeight) || 0.5;
				var desiredVisibleLeft = desiredViewingCenterX * origWidth  - viewportWidth / 2;
				var desiredVisibleTop  = desiredViewingCenterY * origHeight - viewportHeight / 2;
				desiredVisibleLeft = Math.max(desiredVisibleLeft, 0);
				desiredVisibleLeft = Math.min(desiredVisibleLeft, origWidth - viewportWidth);
				desiredVisibleTop = Math.max(desiredVisibleTop, 0);
				desiredVisibleTop = Math.min(desiredVisibleTop, origHeight - viewportHeight);
				img
					.css('left', origWidth - viewportWidth - desiredVisibleLeft)
					.css('top', origHeight - viewportHeight - desiredVisibleTop);
			}

			if (!this.draggableInited) {
				// initialize draggable only once, after first setting of sizes
				var draggableOptions = {
					containment: img.parents('.imgInnerWrapper'),
					scroll: false,
					start: onImgDragged
				};
				if (this.galleryDiv.hasClass('onlyDragVertically')) {
					draggableOptions['axis'] = 'y';
				} else if (this.galleryDiv.hasClass('onlyDragHorizontally')) {
					draggableOptions['axis'] = 'x';
				}
				img.draggable(draggableOptions);
				this.draggableInited = true;
			}
			return;
		}


		this.galleryDiv.find('figure').width( newitemwidth )

		var maxLandscapeItemWidth = newitemwidth - extraMarginForImgLeftRight;
		var maxPotraitItemHeight = maxLandscapeItemWidth * 3/4;	//keep in sync with tinymce-plugin.js, gallery support
		var isPotraitItemHeightDeterminedByLandscapeImage = false;

		this.galleryDiv.find('img').each(function() {
			var naturalWidth = parseInt($(this).attr('origWidth'));
			var naturalHeight = parseInt($(this).attr('origHeight'));

			if (naturalWidth >= naturalHeight) {
				// landscape, should determine the maxPotraitItemHeight
				var thisItemHeight = naturalHeight * maxLandscapeItemWidth / naturalWidth;
				if (!isPotraitItemHeightDeterminedByLandscapeImage || thisItemHeight > maxPotraitItemHeight) {
					maxPotraitItemHeight = thisItemHeight;
					isPotraitItemHeightDeterminedByLandscapeImage = true;
				}
			}
		} );

		var realMaxItemHeight = 0;
		var contributionMaxHeight = 0;
		if (isContribution) {
			var closeBtn = this.galleryDiv.find('.showcase-close');

			contributionMaxHeight = $( window ).height( )
							  - closeBtn.height() + parseInt( closeBtn.css('margin-bottom') )
							  - 100;

			var hasAnyCaptions = false;
			this.galleryDiv.find('figcaption').each(function(el) {
				var thisCaption = $(this).html().trim();
				if (thisCaption !== "" && thisCaption !== "&nbsp;") {
					hasAnyCaptions = true;
					return false;
				}
			});
			if (hasAnyCaptions) {
				contributionMaxHeight -= 80;
			}
		}
		this.galleryDiv.find('img').each(function() {
			var naturalWidth = parseInt($(this).attr('origWidth'));
			var naturalHeight = parseInt($(this).attr('origHeight'));
			var renderWidth = naturalWidth;
			var renderHeight = naturalHeight;

			if (naturalWidth >= naturalHeight) {
				// landscape (or square) images

				if (!isContribution || renderWidth > maxLandscapeItemWidth) {
					var scaleFactor = maxLandscapeItemWidth / renderWidth;
					renderHeight *= scaleFactor;
					renderWidth *= scaleFactor;
				}
			} else {
				// potrait images
				if (!isContribution || renderHeight > maxPotraitItemHeight) {
					var scaleFactor = maxPotraitItemHeight / renderHeight;
					renderHeight *= scaleFactor;
					renderWidth *= scaleFactor;
				}
			}

			if ( isContribution ) {
				if ( renderHeight > contributionMaxHeight ) {
					renderWidth *= contributionMaxHeight / renderHeight;
					renderHeight = contributionMaxHeight;
				}
			}
			renderHeight = Math.floor(renderHeight);
			renderWidth = Math.floor(renderWidth);
			realMaxItemHeight = Math.max(realMaxItemHeight, renderHeight);

			$(this).css({
				width: renderWidth,
				height: renderHeight
			});

			if ( isContribution ) {
				var figure = $(this).parents('figure');
				var image = figure.find( '.imgWrapper' );
				var paddingLft = parseInt( image.css( 'padding-left' ) );
				var paddingRgt = parseInt( image.css( 'padding-right' ) );

				var maxver = renderWidth >= 480 ? 0.66 : 1.0;
				var maxhor = renderWidth >= 640 ? 0.33 : 0.66;

				figure.find('figcaption').css({
					maxWidth: ( figure.find( 'img' ).hasClass( 'vertical' ) ? maxver : maxhor ) * renderWidth,
					marginLeft: Math.max( paddingLft, (newitemwidth - renderWidth)/2 ),
					marginRight: Math.max( paddingRgt, (newitemwidth - renderWidth)/2 )
				})
				oldslidewidth = $(window).width();
			}
		});

		if ( this.itemCount > 1 && !isContribution) {
			this.galleryDiv.find('img').each(function() {
				$(this).css('margin-top', realMaxItemHeight - $(this).height());
			});
		}
		if ( this.itemCount > 1 && oldslidewidth > 0) {
			var oldx = this.currentTranslateX;
			var newx = Math.round( oldx / oldslidewidth ) * newitemwidth;
			var dx = newx - oldx;

			gallery.updateTranslate( dx );
		}

		if (!isContribution) {
			var maxHeight = 0;
			this.galleryDiv.find('figure').each(function(idx,element) {
				maxHeight = Math.max(maxHeight, $(element).height());
			});
			this.galleryDiv.css('height', maxHeight);
		}
	};

	Gallery.prototype.moveImageCounter = function( ) {
		var gallery = $( this.galleryDiv );
		gallery.find( '.imageCounter' ).appendTo( gallery.find( 'h1.showcase-title' ) );
	}

	Gallery.prototype.updateImageCounter = function (imageIndex) {
		if ( imageIndex === undefined ) imageIndex = 1;
		if (this.imageCounter !== null) {
			this.imageCounter.text( imageIndex + '/' + this.itemCount );
		}
	}

	function Collection( ) {
		this.galleries = [];
	}
	Collection.prototype.init = function( imageGalleryDivs ) {
		var that = this;
		imageGalleryDivs.each( function( ) {
			that.galleries.push( new Gallery( $( this ) ) );
		} );
	};

	Collection.prototype.onWindowResize = function( ) {
		var columnwidth = $( '#text' ).width( );
		$( this.galleries ).each( function( ) {
			this.updateItemWidth( columnwidth, 0 );
		} );
	}

	return {
		Collection: Collection
	};
})( );
