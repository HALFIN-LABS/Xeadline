import { combineReducers } from '@reduxjs/toolkit'
// Import slices
import nostrReducer from './slices/nostrSlice'
import testReducer from './slices/testSlice'
import authReducer from './slices/authSlice'
import profileReducer from './slices/profileSlice'
import topicReducer from './slices/topicSlice'
import eventReducer from './slices/eventSlice'
import postReducer from './slices/postSlice'
import voteReducer from './slices/voteSlice'
import flagReducer from './slices/flagSlice'

export const rootReducer = combineReducers({
  // Add reducers
  nostr: nostrReducer,
  test: testReducer,
  auth: authReducer,
  profile: profileReducer,
  topic: topicReducer,
  event: eventReducer,
  post: postReducer,
  vote: voteReducer,
  flag: flagReducer,
})
