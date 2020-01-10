var signupForm = null;

$( function( ) {

	if ( location.search === "?thankyou" ) {
		var reapplyButton = '<a href="' + location.href.split( '?' ).shift( ) + '" class="button" style="border: 0">Subscribe another address</a>';
		
		$( '#subscribe' ).html( '<h2>Subscription Confirmed!</h2>'
							  + '<p>Your subscription to our list has been confirmed.<br>'
							  + 'Thank you for subscribing!</p>'
							  + '<p>' + reapplyButton + '</p>' );
										
	} else {
	
		$( document ).on( 'submit', '#subscribe', function( event ) {
			event.preventDefault( );    
			
			signupForm.post( );
	  	} );

		signupForm = new SubForm( 'onlineopen', 'a3d3234494fcae250b87d270b', '2487a747f3' );
	}
} );


/* SUBSCRIBTION FORM CLASS: ************************************************************/
/* RETURN RESPONSE OBJECT FROM API THROUGH CALLBACK FUNCTION OF THIS.POST(callback) ****/

function SubForm( hostName, accountU, accountId ) {

	var form = this;  
						
	var url = 'http://' + hostName + '.us3.list-manage1.com/subscribe/post-json'
						+ '?u=' + accountU + '&id=' + accountId + '&c=?';
						
	form.formElem = 
		$( '#subscribe' ).attr( { action: url, method: 'post', name: 'subscribe' } );
	
	form.feedBackTitle = $( '<h2>' );
	form.feedBackMsg = $( '<p id="feedback-msg">' );
	
	form.responseCallback = null;
	form.registrationError = function( data ) { console.log( 'err', data ) }


	form.post = function( ) {
		this.firstName = form.formElem.serializeArray( )[ 0 ][ 'value' ];
		this.lastName = form.formElem.serializeArray( )[ 1 ][ 'value' ];
		this.email = form.formElem.serializeArray( )[ 2 ][ 'value' ];
		
		if ( this.email == '' ) {
		$( '#mce-EMAIL' ).css( { 'border-color': '#f00',
								 'box-shadow': '0px 0px 5px #f00' } );
								 
			return false;
		}

		$.ajax( {
			type: form.formElem.attr( 'method' ),
			url: form.formElem.attr( 'action' ),
			data: form.formElem.serialize( ),
			cache: false, dataType: 'jsonp',
			contentType : 'application/json; charset=utf-8',
			error: form.registrationError,
			success: form.registrationFeedback
		} );
	}


	form.registrationFeedback = function( data ){
		var feedBackDiv = $( '<div class="feedback">' );

		if ( data.result == 'success' ) {
			
			// SUBSCRIPTION SUCCEEDED
					
			form.feedBackTitle.html( 'Almost finished...<br>' );
			form.feedBackMsg.html( 'We need to confirm <a href="mailto:' + form.email + '">'+ form.email +'</a>.<br><br>To complete the subscription process,<br>please click the link in the email we just sent you.' );
					
		} else {

			if ( data.msg.indexOf( '@' ) > -1 ) {
			
				// THE USER ALREADY SUBSCRIBED

				form.feedBackTitle.html( 'User already exists<br>' );
			
				var regEmail = new RegExp( form.email, 'gi' );
				data.msg = data.msg.replace( regEmail, '<a href="mailto:' + form.email + '">'+ form.email + '</a>' );

				var updateLink = $( $(data.msg)[2] ).addClass( 'button' )
													.css( 'border', 0 )
													.html( 'Update your profile' );

				updateUrl = $( updateLink ).attr( 'href' );
			
				updateLink.attr('href', 'javascript:;')
						  .click( function( ) { form.userUpdate( updateUrl ) } );


				form.feedBackMsg.append( $( data.msg )[ 0 ], $( data.msg )[ 1 ], 
										 '<br><br>', $( updateLink) );
									 
			} else {
			
				// OTHER ERRORS LIKE: TOO MANY REQUEST || BLANK FIELD
				form.feedBackTitle.html('Something went wrong...<br>');
				data.msg.replace(/this email address/gi, form.email );


				data.msg = data.msg.split( '. ' ).join( '.<br>' );
				data.msg = data.msg.split( '.<br>(' ).join( '. (' );

				form.feedBackMsg.html( data.msg ).addClass('error');
			}

		}

		// REPLACE FORM CONTENTS WITH SERVER REPONSE
		form.formElem.empty( )
				 	 .append( form.feedBackTitle, form.feedBackMsg, form.newRequest );
	}
  
  
	form.userUpdate = function( url ){

		form.feedBackTitle.html( 'Email sent<br>' );
		form.feedBackMsg.html( 'For security, we\'ve sent an email to your inbox that contains a link<br>to update your preferences.' );

		form.formElem.empty( )
			.append( form.feedBackTitle, form.feedBackMsg );
	}
}