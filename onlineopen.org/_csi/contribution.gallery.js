var ShowCase = function(){
	this.isOn = false;
}

ShowCase.prototype.ShowCaseWindow = function( _this, clickedFigure ){

	// we might be in the non-contribution gallery if we're triggering a full screen preview from within an image caption
	// this is supported on any kind of gallery
	contributionGalleryDiv = clickedFigure.parents( 'div.contributionGallery, div.imageGallery' ).clone( );

	// clean up after non-contribution gallery specific additions, in particular for the "natural image size" feature
	contributionGalleryDiv.removeClass('naturalImageSize').removeClass('imageGallery').addClass('contributionGallery');
	contributionGalleryDiv.find('.imgWrapper,.imgInnerWrapper,img').css({width: '', height: '', left: '', top: ''});

	// remove parts of the captione xplicitly requested not ot be shown in the show case mode
	contributionGalleryDiv.find('.hideInShowCase').remove();

	var showCaseWindow = $( '<div class="showcase imageGallery" />' );
	showCaseWindow.appendTo( $( 'body' ) );
	if (contributionGalleryDiv.hasClass('whiteShowCase')) {
		showCaseWindow.addClass('whiteShowCase');
	}


	var closeBtn = $( '<span>' ).addClass( 'button' ).addClass( 'showcase-close' )
								.click( _this.close )
								.data( 'showCase', _this )
								.appendTo( showCaseWindow );

	var titleText = $( 'h1.title' ).text( );
	var titleBar = $( '<h1>' ).text( titleText )
							.addClass( 'showcase-title' )
							.appendTo( showCaseWindow );

	if (contributionGalleryDiv.find('figure').length > 1) {
		$( '<span>' ).addClass( 'showcase-arrow-left' ).appendTo( showCaseWindow );
		$( '<span>' ).addClass( 'showcase-arrow-right' ).appendTo( showCaseWindow );
	}

	showCaseWindow.append( contributionGalleryDiv )

	_this.isOn = true;

	return showCaseWindow;
}

ShowCase.prototype.open = function( event ) {

	var clickedFigure  = $(event.target).parents('figure');

	this.showCaseWindow = new this.ShowCaseWindow( this, clickedFigure );
	this.gallery = new ImageGallery.Collection( );

	this.gallery.init( this.showCaseWindow );
	this.updateSize();

	var gallery = this.gallery.galleries[0];
	$('html').css('overflow', 'hidden');

	gallery.goTo(clickedFigure.index());
	$('.showcase').show( 'slide',{direction: 'up'}, 500);
	gallery.moveImageCounter( );
	gallery.updateImageCounter( clickedFigure.index() + 1 );

};

ShowCase.prototype.close = function( event ) {

	// disables the showCase instead of the close button ;-)
	$( this ).data( 'showCase' ).isOn = false;

	$('.showcase').hide( 'slide',{direction: 'down'}, 500, function(){
		$( this ).remove();
		$('html').css('overflow', 'auto');
	});
};

ShowCase.prototype.updateSize = function(){
	$( this.gallery.galleries ).each( function( ) {
		// 128 = 2 * 64 - for arrows. keep in sync with "div.showcase figure .imgWrapper / padding"
		this.updateItemWidth( $(window).width(), 128 );
	});
}


var ContributionGallery = (function( ) {

	function Gallery( galleryDiv ) {
		this.galleryDiv = galleryDiv;
		galleryDiv
			.removeClass('imageGallery')
			.addClass('contributionGallery');
		if (!singleColumnContributionGallery) {
			galleryDiv.addClass('duoColumnContributionGallery');
		}
		galleryDiv.find('figure')
			.click( function(e){
				showCase.open(e);
			} )
			.each( function(){
				$(this).addClass( $(this).find('img').attr('class') );
			})
	}

	Gallery.prototype.updateSizing = function (fullWidth) {
		// the sizing principle for those galleries is that
		// the widest element dictates the height
		// so first we have to find the widest element
		var widestImageWidth = -1;
		var widestImageHeight = -1;
		var allImgs = this.galleryDiv.find('figure img');
		allImgs.each(function() {
			var img = $(this);
			var origHeight = +img.attr('origheight');
			var origWidth = +img.attr('origwidth');
			if (origWidth > widestImageWidth) {
				widestImageWidth = origWidth;
				widestImageHeight = origHeight;
			}
		});
		if (widestImageWidth < 0) {
			return;
		}

		var innerMargin = 6;	/* keep in sync with the style for div.duoColumnContributionGallery figure:nth-child(odd) */
		var maxWidth = (singleColumnContributionGallery ? fullWidth : (Math.floor(fullWidth / 2) - innerMargin)) - 1;
		var maxHeight = maxWidth / widestImageWidth * widestImageHeight;

		// calculate widths and heights
		var sizes = [];
		allImgs.each(function() {
			var img = $(this);
			var origHeight = +img.attr('origheight');
			var origWidth = +img.attr('origwidth');
			var scaledHeight = origHeight;
			var scaledWidth = origWidth;
			if (origWidth > origHeight) {
				scaledWidth = maxWidth;
				scaledHeight = origHeight * (maxWidth / origWidth);
			} else {
				scaledHeight = maxHeight;
				scaledWidth = origWidth * (maxHeight / origHeight);
			}
			sizes.push([scaledWidth, scaledHeight]);
		});

		// apply sizes
		allImgs.each(function(idx) {
			var img = $(this);
			img.css({
				width: sizes[idx][0],
				height: sizes[idx][1]
			});

			// unless it's one single item in the last row
			if (!singleColumnContributionGallery && !(idx == allImgs.length - 1 && idx % 2  == 0)) {
				// also add margin-top, in case this img is shorter than the neighbour
				var rowNeighbourIdx = idx % 2 == 0 ? idx + 1 : idx - 1;
				var thisRowHeight = Math.max(sizes[idx][1], sizes[rowNeighbourIdx][1]);
				var marginTop = thisRowHeight - sizes[idx][1];
				if (marginTop > 0) {
					img.css({
						marginTop: marginTop
					});
				}
			}
		});
		this.galleryDiv.find('figure').css('width', maxWidth);
	}

	function Collection( ) {
		this.galleries = [];
	}

	Collection.prototype.init = function( imageGalleryDivs ) {
		var that = this;
		imageGalleryDivs
			.each( function( ) {
				that.galleries.push( new Gallery( $( this ) ) );
			});
	};

	Collection.prototype.onWindowResize = function() {
		var columnwidth = $( '#text' ).width( );
		for (var i=0; i < this.galleries.length; ++i) {
			this.galleries[i].updateSizing(columnwidth);
		}
	}

	return {
		Collection: Collection
	};
})( );
