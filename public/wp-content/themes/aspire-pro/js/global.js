jQuery(function( $ ){

	if( $( document ).scrollTop() > 0 ){
		$( '.site-header' ).addClass( 'light' );
	}

	// Add opacity class to site header
	$( document ).on('scroll', function(){

		if ( $( document ).scrollTop() > 0 ){
			$( '.site-header' ).addClass( 'light' );

		} else {
			$( '.site-header' ).removeClass( 'light' );
		}

	});


});
