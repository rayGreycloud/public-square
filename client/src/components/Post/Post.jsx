import React from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from 'react-query';

import PostContent from '../PostContent';
import Spinner from '../Spinner';

const Post = () => {
  const { id } = useParams();

  function usePost() {
    return useQuery('post', async () => {
      const { data } = await axios.get(`/api/posts/${id}`);
      return data;
    });
  }
  // fetch post data
  const { status, data, error, isFetching } = usePost();
  // check if existing data belongs to target post
  const isDataStale = id !== data?.post?.hash;

  return (
    <div className='row justify-content-center '>
      <div className='col-xs-10 col-sm-9 col-md-8 col-xl-7 position-relative'>
        <Link to='/' className='btn-back' title='Go Back'>
          <i className='bi bi-arrow-left-circle-fill'></i>
        </Link>
        <header className='App-header'>
          <h2 className='text-center display-6 text-light'>Post</h2>
        </header>

        <div>
          {status === 'loading' || (isFetching && isDataStale) ? (
            <Spinner />
          ) : status === 'error' ? (
            <span>Error: {error.message}</span>
          ) : (
            <>
              <PostContent
                key={data.post.hash.substring(data.post.hash.length - 8)}
                data={data}
              />
              {isFetching ? <Spinner /> : ''}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;
