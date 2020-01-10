$(function( ) {

	function crosslinkFootnoteClicked( e ) {
		e.preventDefault( );
		window.document.location = $( this ).data( 'location' );
	}

	var sortOrderCookieName = 'contributors_sort_order';
	function stringCompare(s1, s2) {
		if (s1 == s2) {
			return 0;
		}
		return s1 < s2 ? -1 : 1;
	}
	function contributorsByNameSort(c1, c2) {
		var lastnameCmp = stringCompare($(c1).attr('lastname'), $(c2).attr('lastname'));
		if (lastnameCmp != 0) {
			return lastnameCmp;
		}
		return stringCompare($(c1).attr('firstname'), $(c2).attr('firstname'));
	}
	function contributorsByDateSort(c1, c2) {
		var dateCmp = -stringCompare($(c1).attr('mostrecentarticle'), $(c2).attr('mostrecentarticle'));
		if (dateCmp != 0){
			return dateCmp;
		}
		return contributorsByNameSort(c1, c2);
	}
	function isDigit(c) {
		return c.charCodeAt(0) >= '0'.charCodeAt(0) && c.charCodeAt(0) <= '9'.charCodeAt(0);
	}
	var firstContributorPerLetter = null;
	function sortContributors(sortOrder) {
		var contributors = $('.contributor').detach().get();

		if (firstContributorPerLetter === null) {
			firstContributorPerLetter = {};
			contributors.sort(contributorsByNameSort);
			var lastLetter = ' ';
			for (var i =0 ; i < contributors.length; ++i) {
				var thisLetter = $(contributors[i]).attr('lastname').charAt(0);
				if (isDigit(thisLetter)) {
					thisLetter = 'HASH';
				}
				if (thisLetter != lastLetter) {
					firstContributorPerLetter[thisLetter] = true;
					lastLetter = thisLetter;
				}
			}
		}

		contributors.sort(sortOrder == "name" ? contributorsByNameSort : contributorsByDateSort);
		if (sortOrder == "name") {
			$('.firstLetterMenu').show()
		} else {
			$('.firstLetterMenu').hide()
		}
		$(contributors).appendTo( '#text' ).show();
		$('.sortButton').removeClass('selected');
		$('.sortButton[sortorder="' + sortOrder + '"]').addClass('selected');
		$('.firstLetterMenu .selected').removeClass('selected');

		$('.contributors')
			.removeClass('sortbyname')
			.removeClass('sortbydate')
			.addClass('sortby' + sortOrder);
		docCookies.setItem(sortOrderCookieName, sortOrder, 60 * 60 * 24 * 14);	//expiry of 14 days
	}

	var startingSortOrder = docCookies.getItem( sortOrderCookieName );
	if (startingSortOrder === null || (startingSortOrder != "name" && startingSortOrder != "date")) {
		startingSortOrder = "name";
	}
	sortContributors( startingSortOrder );
	$('.sortButton').click(function() {
		sortContributors( $(this).attr('sortorder') );
	});
	function firstLetterFilterClicked() {
		var enabling = !$(this).hasClass('selected');
		$('.firstLetterMenu span').removeClass('selected');
		$(this).toggleClass('selected', enabling);
		if (enabling) {
			var firstLetterFilter = $(this).text();
			$('.contributor').each(function() {
				var thisFirstLetter = $(this).attr('lastname').charAt(0);
				var enabled = (firstLetterFilter == '#' && isDigit(thisFirstLetter))
								|| (thisFirstLetter == firstLetterFilter);
				$(this).toggle(enabled);
			});
		} else {
			$('.contributor').show();
		}
	}
	{
		var firstLetterMenu = $('.firstLetterMenu');

		function createLetterTag(key, desc) {
			var el = $( '<span>' ).html(desc).appendTo(firstLetterMenu);
			if (key in firstContributorPerLetter) {
				el.addClass('active');
			}
			return el;
		}

		if ('HASH' in firstContributorPerLetter) {
			createLetterTag('HASH', '#');
		}

		var code_a = "a".charCodeAt(0);
		var code_z = "z".charCodeAt(0);
		for (var code = code_a ; code <= code_z; ++code) {
			var c = String.fromCharCode(code);
			createLetterTag(c, c).addClass('smallcaps');
		}
		firstLetterMenu.find('.active').click(firstLetterFilterClicked);
	}


	$( '.crosslinkFootnote' ).each( function( ) {
		$( this ).data( 'location', $( this ).attr( 'contributionid' ) )
				.removeAttr( 'contributionid' );

		var snippet = $( this ).find( '.snippet' );
		if ( snippet.size( ) > 0 ) {

			// remove images
			snippet.find( 'img' ).remove( );

			var summary = snippet.text( );
			var summarylength = 120;
			if ( summary.length > summarylength ) {
				summary = summary.substr( 0, summarylength );
				summary = summary.split( ' ' );
				summary.pop( );
				summary = summary.join( ' ' ) + ' […]';
					snippet.text( summary );
			}
		}
	} ).click( crosslinkFootnoteClicked );

	$( '.contributor' ).each( function( ) {
		var contribution = $( this ).find( '.contributions' );

		$( this ).find( '.biography a' ). each( function( ) {
			contribution.append( cloneLinkForSidebar( $(this) ) );
		} );
	} );

	$( '.moreContributionsButton' ).click( function() {
		$(this).hide()
		$(this).parent().find('.moreContributions').fadeIn();
	});
} );