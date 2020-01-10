var SidebarManager = null;

$( function( ) {
	var wrapper = $( '#wrapper' );
	var sidebar = $( '#sidebar' );

	var colsToDrag = 1;
	var currentPosition = 0;

	var speed = 350;

	var slideButton;

	function updateMaxNumOfCols() {
		var screenWidth = $( window ).width( );

		colsToDrag = 1;
		if ( screenWidth <= 1024 ) colsToDrag = 2;
		if ( screenWidth <= 800 )  colsToDrag = 3;
	}

	function updateSlideBtns( ) {
		if (colsToDrag > 1) {
			slideButton.show();
			if (currentPosition == 0) {
				slideButton.addClass('pull-in').removeClass('pull-away');
			} else {
				slideButton.addClass('pull-away').removeClass('pull-in');
			}
		} else {
			slideButton.hide();
		}
	}

	function onCurrentPositionUpdate( ) {
		scrollCols( $( '#navigation' ).outerWidth( ) * currentPosition, speed );
		updateSlideBtns( );
	}

	function slideButtonClick( ) {
		if (currentPosition === 0) {
			currentPosition = colsToDrag - 1;
		} else {
			currentPosition = 0;
		}
		onCurrentPositionUpdate( );
	}

	function scrollCols( distance, duration ) {
		sidebar.css( {
			'transition-duration': ( duration / 1000 ).toFixed( 1 ) + 's',
			'transition-timing-function': 'ease-out',
			'transform': 'translate3d(' + (-distance) + 'px,0,0)'
		} );
	}

	function showAllIfHidden() {
		if (colsToDrag > 1) {
			currentPosition = colsToDrag - 1;
			onCurrentPositionUpdate( );
		}
	}

	function onResizeHandler() {
		updateMaxNumOfCols( );
		// on resize (incl. orientation change), hide rapidly if we were pulled in
		if ( currentPosition !== 0) {
			currentPosition = 0;
			scrollCols( 0, 0 );
		}
		updateSlideBtns( );
	}

	function onScrollHandler() {
		// on scroll, hide smoothly
		if ( currentPosition !== 0) {
			currentPosition = 0;
			scrollCols( 0, speed );
			updateSlideBtns( );
		}
	}

	slideButton = $( '#slide-button' ).click( slideButtonClick );
	$( window ).resize( onResizeHandler );
	$( window ).on( 'scroll', onScrollHandler );

	updateMaxNumOfCols();
	updateSlideBtns( );

	SidebarManager = {
		showAllIfHidden: showAllIfHidden
	};
} );
