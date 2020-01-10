$(function( ) {

	function defFootnoteClicked( ) {
		forceOpenNewWindowEvenInStandalone( $( this ).data( 'location' ) );
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

	$( '.article div.imageGallery, .article span.footnote-image' ).remove( );

	$( '.article a.crosslink' ).each(function () {
		$(this).replaceWith( $(this).html() );
	});


	$( '.article' ).each( function( ) {
		var sidebar = $( this ).find( '.sidebar' );

		$( this ).find( '.def' ). each( function( ) {
			var defReferenceElement = $( this );
			var definition = defReferenceElement.attr( 'cont' );
			var term = defReferenceElement.text( );
			var source = defReferenceElement.attr( 'source' );

			var defFootnote = $( '<div class=defFootnote></div>' )
				.appendTo( sidebar )
				.append( $( '<div class=source>' + simplifyRawUrl( source ) + '</div>' ) )
				.append( '<div class=definition>' + decorateDefinition( definition, term ) + ' [&hellip;]</div>' )
				.data( 'location', source )
				.click( defFootnoteClicked );
		} );
		$( this ).find( 'p a:not(.filterlink):not(.titlelink)').each(function( ) {
			sidebar.append( cloneLinkForSidebar( $(this) ) );
		} );
	} );
} );
